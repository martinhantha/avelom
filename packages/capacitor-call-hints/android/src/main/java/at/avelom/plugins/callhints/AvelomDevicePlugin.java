package at.avelom.plugins.callhints;

import android.Manifest;
import android.accounts.Account;
import android.accounts.AccountManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ContentProviderOperation;
import android.content.ContentProviderResult;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.ContactsContract;
import android.provider.Settings;
import android.provider.ContactsContract.CommonDataKinds.Note;
import android.provider.ContactsContract.CommonDataKinds.Organization;
import android.provider.ContactsContract.CommonDataKinds.Phone;
import android.provider.ContactsContract.CommonDataKinds.StructuredName;
import android.provider.ContactsContract.RawContacts;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;

@CapacitorPlugin(
    name = "AvelomDevice",
    permissions = {
        @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO, Manifest.permission.MODIFY_AUDIO_SETTINGS }),
        @Permission(alias = "contacts", strings = { Manifest.permission.READ_CONTACTS, Manifest.permission.WRITE_CONTACTS }),
        @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
    }
)
public class AvelomDevicePlugin extends Plugin {

    private static final String ACCOUNT_NAME = "Avelom";
    private static final String ACCOUNT_TYPE = "at.avelom.app";
    private static final String GOOGLE_ACCOUNT_PREFIX = "com.google";
    private static final String NOTIFICATION_CHANNEL_ID = "avelom_appointments";

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        JSObject result = new JSObject();
        result.put("microphone", getPermissionState("microphone").toString());
        result.put("contacts", getPermissionState("contacts").toString());
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            result.put("notifications", PermissionState.GRANTED.toString());
        } else {
            result.put("notifications", getPermissionState("notifications").toString());
        }
        call.resolve(result);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        String alias = call.getString("alias");
        if (alias == null || alias.isEmpty()) {
            requestAllPermissions(call);
            return;
        }
        if ("contacts".equals(alias)) {
            if (getPermissionState("contacts") == PermissionState.GRANTED) {
                checkPermissions(call);
                return;
            }
            requestPermissionForAlias("contacts", call, "permissionsCallback");
            return;
        }
        if ("notifications".equals(alias)) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU
                    || getPermissionState("notifications") == PermissionState.GRANTED) {
                checkPermissions(call);
                return;
            }
            requestPermissionForAlias("notifications", call, "permissionsCallback");
            return;
        }
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            checkPermissions(call);
            return;
        }
        requestPermissionForAlias("microphone", call, "permissionsCallback");
    }

    @PluginMethod
    public void requestAllPermissions(PluginCall call) {
        boolean microphoneGranted = getPermissionState("microphone") == PermissionState.GRANTED;
        boolean contactsGranted = getPermissionState("contacts") == PermissionState.GRANTED;
        if (microphoneGranted && contactsGranted) {
            checkPermissions(call);
            return;
        }
        requestPermissionForAliases(new String[] { "microphone", "contacts" }, call, "permissionsCallback");
    }

    @PluginMethod
    public void requestMicrophone(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            checkPermissions(call);
            return;
        }
        requestPermissionForAlias("microphone", call, "permissionsCallback");
    }

    @PluginMethod
    public void showLocalNotification(PluginCall call) {
        ensureNotificationChannel();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && getPermissionState("notifications") != PermissionState.GRANTED) {
            call.resolve();
            return;
        }

        String title = call.getString("title", "Avelom");
        String body = call.getString("body", "");
        String id = call.getString("id");
        int notificationId = id != null && !id.isEmpty() ? id.hashCode() : (int) System.currentTimeMillis();

        Context context = getContext();
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) {
            call.resolve();
            return;
        }

        int icon = context.getApplicationInfo().icon;
        if (icon == 0) {
            icon = android.R.drawable.ic_popup_reminder;
        }

        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(context, NOTIFICATION_CHANNEL_ID);
        } else {
            builder = new Notification.Builder(context);
        }

        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch != null) {
            launch.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
            }
            builder.setContentIntent(PendingIntent.getActivity(context, 0, launch, pendingFlags));
        }

        builder.setSmallIcon(icon)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder.setCategory(Notification.CATEGORY_EVENT);
        }
        manager.notify(notificationId, builder.build());
        call.resolve();
    }

    private void ensureNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationManager manager = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null || manager.getNotificationChannel(NOTIFICATION_CHANNEL_ID) != null) {
            return;
        }
        NotificationChannel channel = new NotificationChannel(
            NOTIFICATION_CHANNEL_ID,
            "Termine",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Neue Termine in Avelom");
        manager.createNotificationChannel(channel);
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.parse("package:" + getContext().getPackageName()));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getActivity().startActivity(intent);
        call.resolve();
    }

    @PermissionCallback
    private void permissionsCallback(PluginCall call) {
        checkPermissions(call);
    }

    @PluginMethod
    public void saveLocalContact(PluginCall call) {
        if (getPermissionState("contacts") != PermissionState.GRANTED) {
            requestPermissionForAlias("contacts", call, "saveContactAfterPermission");
            return;
        }
        insertLocalContact(call);
    }

    @PermissionCallback
    private void saveContactAfterPermission(PluginCall call) {
        if (getPermissionState("contacts") != PermissionState.GRANTED) {
            call.reject("WRITE_CONTACTS permission denied");
            return;
        }
        insertLocalContact(call);
    }

    private void insertLocalContact(PluginCall call) {
        String displayName = call.getString("displayName", "").trim();
        if (displayName.isEmpty()) {
            displayName = "Avelom Kontakt";
        }
        String phone = emptyToNull(call.getString("phone"));
        String note = emptyToNull(call.getString("note"));
        String organization = emptyToNull(call.getString("organization"));
        if (organization == null) {
            organization = ACCOUNT_NAME;
        }

        try {
            String contactId = applyInsert(displayName, phone, note, organization, true);
            if (contactId == null) {
                contactId = applyInsert(displayName, phone, note, organization, false);
            }
            if (contactId == null) {
                call.reject("Contact could not be saved locally");
                return;
            }
            JSObject result = new JSObject();
            result.put("contactId", contactId);
            call.resolve(result);
        } catch (Exception exception) {
            call.reject("Failed to save local contact", exception);
        }
    }

    private String applyInsert(String displayName, String phone, String note, String organization, boolean useAvelomAccount)
        throws Exception {
        ArrayList<ContentProviderOperation> ops = new ArrayList<>();
        ContentProviderOperation.Builder accountOp = ContentProviderOperation.newInsert(RawContacts.CONTENT_URI);
        if (useAvelomAccount) {
            String[] account = resolveNonGoogleAccount();
            accountOp.withValue(RawContacts.ACCOUNT_NAME, account[0]).withValue(RawContacts.ACCOUNT_TYPE, account[1]);
        } else {
            // Last-resort local insert. Some OEMs still remap this to Google.
            accountOp.withValue(RawContacts.ACCOUNT_TYPE, null).withValue(RawContacts.ACCOUNT_NAME, null);
        }
        ops.add(accountOp.build());

        ops.add(
            ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                .withValue(ContactsContract.Data.MIMETYPE, StructuredName.CONTENT_ITEM_TYPE)
                .withValue(StructuredName.GIVEN_NAME, displayName)
                .build()
        );

        ops.add(
            ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                .withValue(ContactsContract.Data.MIMETYPE, Organization.CONTENT_ITEM_TYPE)
                .withValue(Organization.COMPANY, organization)
                .withValue(Organization.TITLE, "Avelom-App")
                .build()
        );

        if (note != null) {
            ops.add(
                ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                    .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                    .withValue(ContactsContract.Data.MIMETYPE, Note.CONTENT_ITEM_TYPE)
                    .withValue(Note.NOTE, note)
                    .build()
            );
        }

        if (phone != null) {
            ops.add(
                ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                    .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                    .withValue(ContactsContract.Data.MIMETYPE, Phone.CONTENT_ITEM_TYPE)
                    .withValue(Phone.TYPE, Phone.TYPE_MOBILE)
                    .withValue(Phone.NUMBER, phone)
                    .withValue(Phone.IS_PRIMARY, 1)
                    .build()
            );
        }

        ContentResolver resolver = getContext().getContentResolver();
        ContentProviderResult[] result = resolver.applyBatch(ContactsContract.AUTHORITY, ops);
        if (result == null || result.length == 0 || result[0] == null || result[0].uri == null) {
            return null;
        }
        return result[0].uri.getLastPathSegment();
    }

    /**
     * Prefer the Avelom local account. If the device already has a non-Google phone
     * account (Samsung "Phone", etc.), use that instead so the contact never syncs.
     */
    private String[] resolveNonGoogleAccount() {
        try {
            Account[] accounts = AccountManager.get(getContext()).getAccounts();
            for (Account account : accounts) {
                if (account.type != null && account.type.startsWith(GOOGLE_ACCOUNT_PREFIX)) {
                    continue;
                }
                if (account.name != null && account.type != null) {
                    return new String[] { account.name, account.type };
                }
            }
        } catch (Exception ignored) {
            // Missing GET_ACCOUNTS is fine — fall back to the Avelom local account.
        }
        return new String[] { ACCOUNT_NAME, ACCOUNT_TYPE };
    }

    private static String emptyToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
