/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fix for opentelemetry module resolution issue
  serverExternalPackages: [
    '@opentelemetry/resources',
    '@opentelemetry/sdk-node',
    '@opentelemetry/sdk-metrics',
    '@opentelemetry/sdk-trace-node',
    '@opentelemetry/exporter-trace-otlp-grpc',
    '@opentelemetry/exporter-trace-otlp-http',
    '@opentelemetry/exporter-trace-otlp-proto',
    '@opentelemetry/exporter-zipkin',
    '@opentelemetry/auto-instrumentations-node'
  ],
  // Resolve alias for opentelemetry resources
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@opentelemetry/resources': '@opentelemetry/resources/build/src',
    };
    return config;
  },
};

export default nextConfig;