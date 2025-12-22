// Build information injected during build time
declare const __BUILD_INFO__: {
  commitHash: string;
  buildDate: string;
};

export const buildInfo = typeof __BUILD_INFO__ !== 'undefined' 
  ? __BUILD_INFO__ 
  : { 
      commitHash: 'dev', 
      buildDate: new Date().toISOString().split('T')[0] 
    };

export const getBuildVersion = (): string => {
  return `v${buildInfo.buildDate.replace(/-/g, '')}-${buildInfo.commitHash}`;
};
