'use client';

import { useState } from 'react';
import type { MediaAsset } from '../content/models';

export function PlatformMediaIcon({ asset, className, fallback = '' }: { asset?: MediaAsset; className: string; fallback?: string }) {
  const [failedReference, setFailedReference] = useState<string>();
  if (!asset || failedReference === asset.reference) return fallback ? <span className="footer-social-icon" aria-hidden="true">{fallback}</span> : null;
  return <img className={className} src={asset.reference} alt="" onError={() => setFailedReference(asset.reference)} />;
}
