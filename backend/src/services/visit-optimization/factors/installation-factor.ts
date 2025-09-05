// Installation Factor Calculator
export interface InstallationFactor {
  calculateFactor(installationData: any): number;
}

export class DefaultInstallationFactor implements InstallationFactor {
  calculateFactor(installationData: any): number {
    // Default implementation
    return 1.0;
  }
}