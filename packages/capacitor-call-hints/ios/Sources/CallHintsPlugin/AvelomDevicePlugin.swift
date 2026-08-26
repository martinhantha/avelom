import AVFoundation
import Capacitor
import Contacts
import UIKit

@objc(AvelomDevicePlugin)
public class AvelomDevicePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AvelomDevicePlugin"
    public let jsName = "AvelomDevice"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "checkPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAllPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestMicrophone", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openAppSettings", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveLocalContact", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showLocalNotification", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startSpeechRecognition", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopSpeechRecognition", returnType: CAPPluginReturnPromise)
    ]

    @objc func checkPermissions(_ call: CAPPluginCall) {
        call.resolve(permissionStatus())
    }

    @objc override public func requestPermissions(_ call: CAPPluginCall) {
        requestAllPermissions(call)
    }

    @objc func requestAllPermissions(_ call: CAPPluginCall) {
        AVAudioSession.sharedInstance().requestRecordPermission { _ in
            CNContactStore().requestAccess(for: .contacts) { _, _ in
                DispatchQueue.main.async {
                    call.resolve(self.permissionStatus())
                }
            }
        }
    }

    @objc func requestMicrophone(_ call: CAPPluginCall) {
        AVAudioSession.sharedInstance().requestRecordPermission { _ in
            DispatchQueue.main.async {
                call.resolve(self.permissionStatus())
            }
        }
    }

    @objc func openAppSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if let url = URL(string: UIApplication.openSettingsURLString) {
                UIApplication.shared.open(url)
            }
            call.resolve()
        }
    }

    @objc func saveLocalContact(_ call: CAPPluginCall) {
        let store = CNContactStore()
        store.requestAccess(for: .contacts) { granted, error in
            if !granted {
                DispatchQueue.main.async {
                    call.reject(error?.localizedDescription ?? "Contacts permission denied")
                }
                return
            }
            let result: [String: String]
            do {
                let contact = CNMutableContact()
                let displayName = call.getString("displayName")?.trimmingCharacters(in: .whitespacesAndNewlines)
                contact.givenName = (displayName?.isEmpty == false) ? displayName! : "Avelom Kontakt"
                contact.organizationName = call.getString("organization") ?? "Avelom"
                contact.jobTitle = "Avelom-App"
                if let note = call.getString("note")?.trimmingCharacters(in: .whitespacesAndNewlines), !note.isEmpty {
                    contact.note = note
                }
                if let phone = call.getString("phone")?.trimmingCharacters(in: .whitespacesAndNewlines), !phone.isEmpty {
                    contact.phoneNumbers = [
                        CNLabeledValue(label: CNLabelPhoneNumberMobile, value: CNPhoneNumber(stringValue: phone))
                    ]
                }

                let saveRequest = CNSaveRequest()
                saveRequest.add(contact, toContainerWithIdentifier: self.localContainerId(store))
                try store.execute(saveRequest)
                result = ["contactId": contact.identifier]
            } catch {
                DispatchQueue.main.async {
                    call.reject("Failed to save local contact", error.localizedDescription, error)
                }
                return
            }
            DispatchQueue.main.async {
                call.resolve(result)
            }
        }
    }

    @objc func showLocalNotification(_ call: CAPPluginCall) {
        call.resolve()
    }

    @objc func startSpeechRecognition(_ call: CAPPluginCall) {
        call.reject("startSpeechRecognition is Android-only")
    }

    @objc func stopSpeechRecognition(_ call: CAPPluginCall) {
        call.resolve()
    }

    private func permissionStatus() -> [String: String] {
        let mic: String
        switch AVAudioSession.sharedInstance().recordPermission {
        case .granted:
            mic = "granted"
        case .denied:
            mic = "denied"
        default:
            mic = "prompt"
        }
        let contacts: String
        switch CNContactStore.authorizationStatus(for: .contacts) {
        case .authorized:
            contacts = "granted"
        case .denied, .restricted:
            contacts = "denied"
        default:
            contacts = "prompt"
        }
        return [
            "microphone": mic,
            "contacts": contacts
        ]
    }

    private func localContainerId(_ store: CNContactStore) -> String? {
        let containers = (try? store.containers(matching: nil)) ?? []
        return containers.first(where: { $0.type == .local })?.identifier
    }
}
