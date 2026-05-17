/** @type {import('next').NextConfig} */
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
const isPages = process.env.DEPLOY_TARGET === 'gh-pages';

const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  basePath: isPages && repo ? `/${repo}` : '',
  assetPrefix: isPages && repo ? `/${repo}/` : '',
  trailingSlash: true,
};

module.exports = nextConfig;
