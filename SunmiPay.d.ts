declare module 'react-native' {
  interface NativeModulesStatic {
    SunmiPay: {
      startEMV(): Promise<boolean>;
    };
  }
}