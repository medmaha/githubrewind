import { defineConfig, loadEnv } from 'vite';
import vinext from 'vinext';
import { cloudflare } from '@cloudflare/vite-plugin';
import { imagesOptimizer } from '@vinext/cloudflare/images/images-optimizer';

export default defineConfig({
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  plugins: [
    vinext({
      images: { optimizer: imagesOptimizer() },
    }),
    cloudflare({
      viteEnvironment: {
        name: 'rsc',
        childEnvironments: ['ssr'],
      },
    }),
  ],
});
