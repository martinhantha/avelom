import { createRuntimeDeviceCapabilities } from "../utils/create-device-capabilities";

export default defineNuxtPlugin(() => {
  return {
    provide: {
      device: createRuntimeDeviceCapabilities(),
    },
  };
});
