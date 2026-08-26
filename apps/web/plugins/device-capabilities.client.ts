import { createRuntimeDeviceCapabilities } from "../utils/create-device-capabilities";
import { installRuntimeDevice } from "../composables/useDeviceCapabilities";

export default defineNuxtPlugin(() => {
  const device = createRuntimeDeviceCapabilities();
  installRuntimeDevice(device);
  return {
    provide: {
      device,
    },
  };
});
