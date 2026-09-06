/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: false,
  allowedDevOrigins: ['192.168.11.102'],
  devIndicators: false,
  async headers() {
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      ...(process.env.NODE_ENV === 'production'
        ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
        : []),
    ];
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default nextConfig;
