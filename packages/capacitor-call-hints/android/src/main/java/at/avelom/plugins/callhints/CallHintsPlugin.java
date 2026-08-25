package at.avelom.plugins.callhints;

import android.Manifest;
import android.database.Cursor;
import android.provider.CallLog;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.TimeZone;

@CapacitorPlugin(
    name = "CallHints",
    permissions = { @Permission(alias = "callLog", strings = { Manifest.permission.READ_CALL_LOG }) }
)
public class CallHintsPlugin extends Plugin {

    @PluginMethod
    public void getRecentCallHints(PluginCall call) {
        if (getPermissionState("callLog") != PermissionState.GRANTED) {
            requestPermissionForAlias("callLog", call, "callLogPermsCallback");
            return;
        }
        fetchHints(call);
    }

    @PermissionCallback
    private void callLogPermsCallback(PluginCall call) {
        if (getPermissionState("callLog") == PermissionState.GRANTED) {
            fetchHints(call);
        } else {
            call.reject("READ_CALL_LOG permission denied");
        }
    }

    private void fetchHints(PluginCall call) {
        int limit = call.getInt("limit", 5);
        if (limit < 1) {
            limit = 1;
        }
        if (limit > 20) {
            limit = 20;
        }

        JSArray hints = new JSArray();
        String[] projection = new String[] { CallLog.Calls.NUMBER, CallLog.Calls.DATE };

        try (
            Cursor cursor = getContext()
                .getContentResolver()
                .query(
                    CallLog.Calls.CONTENT_URI,
                    projection,
                    CallLog.Calls.NUMBER + " IS NOT NULL AND " + CallLog.Calls.NUMBER + " != ''",
                    null,
                    CallLog.Calls.DATE + " DESC"
                )
        ) {
            if (cursor != null) {
                LinkedHashSet<String> seen = new LinkedHashSet<>();
                int rank = 0;
                SimpleDateFormat iso = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                iso.setTimeZone(TimeZone.getTimeZone("UTC"));

                while (cursor.moveToNext() && hints.length() < limit) {
                    String number = cursor.getString(0);
                    if (number == null) {
                        continue;
                    }
                    String raw = number.trim();
                    String normalized = raw.replaceAll("[^+0-9]", "");
                    if (normalized.isEmpty() || seen.contains(normalized)) {
                        continue;
                    }
                    seen.add(normalized);

                    JSObject hint = new JSObject();
                    hint.put("raw", raw);
                    if (normalized.startsWith("+")) {
                        hint.put("e164", normalized);
                    }
                    hint.put("lastSeenAt", iso.format(new Date(cursor.getLong(1))));
                    hint.put("confidence", Math.max(0.4, 1.0 - rank * 0.1));
                    hints.put(hint);
                    rank++;
                }
            }
        } catch (Exception exception) {
            call.reject("Failed to read call hints", exception);
            return;
        }

        JSObject result = new JSObject();
        result.put("hints", hints);
        call.resolve(result);
    }
}
