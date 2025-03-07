import { parseObject } from '../processing/json';
import {
  assertDefined,
  defaultOpts,
  defaultPackageOpts,
  executeModule,
} from '../testing/module';
import type { TsConfigJson } from '../types';

import { tsconfigModule } from './tsconfig';

describe('tsconfigModule', () => {
  it('works from scratch', async () => {
    const inputFiles = {};

    const outputFiles = await executeModule(
      tsconfigModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['tsconfig.build.json']).toContain('./tsconfig.json');
    expect(outputFiles['tsconfig.json']).toContain(
      'skuba/config/tsconfig.json',
    );

    const outputData = parseObject(
      outputFiles['tsconfig.json'],
    ) as TsConfigJson;

    assertDefined(outputData);
    expect(outputData.compilerOptions!.baseUrl).toBe('.');
    expect(outputData.compilerOptions!.paths).toEqual({ src: ['src'] });
  });

  it('disables module aliasing and retains comments for packages', async () => {
    const inputFiles = {};

    const outputFiles = await executeModule(
      tsconfigModule,
      inputFiles,
      defaultPackageOpts,
    );

    expect(outputFiles['tsconfig.build.json']).toContain('./tsconfig.json');
    expect(outputFiles['tsconfig.json']).toContain(
      'skuba/config/tsconfig.json',
    );

    const outputData = parseObject(
      outputFiles['tsconfig.json'],
    ) as TsConfigJson;

    assertDefined(outputData);
    expect(outputData.compilerOptions!.baseUrl).toBeUndefined();
    expect(outputData.compilerOptions!.paths).toBeUndefined();
    expect(outputData.compilerOptions!.removeComments).toBe(false);
  });

  it('respects explicit comment removal for packages', async () => {
    const inputFiles = {
      'tsconfig.json': '{"compilerOptions": {"removeComments": true}}',
    };

    const outputFiles = await executeModule(
      tsconfigModule,
      inputFiles,
      defaultPackageOpts,
    );

    const outputData = parseObject(
      outputFiles['tsconfig.json'],
    ) as TsConfigJson;

    assertDefined(outputData);
    expect(outputData.compilerOptions!.removeComments).toBe(true);
  });

  it('augments existing config', async () => {
    const inputFiles = {
      'tsconfig.build.json': '{}',
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          lib: ['ES2020'],
          target: 'ES2020',
        },
        exclude: ['.idea'],
        include: ['src'],
      }),
      '.eslintrc.js': undefined,
      '.prettierrc.toml': undefined,
      'package.json': JSON.stringify({
        name: 'secret-service',
        prettier: {
          extends: [],
        },
      }),
    };

    const outputFiles = await executeModule(
      tsconfigModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['tsconfig.build.json']).toBe(
      inputFiles['tsconfig.build.json'],
    );

    const outputData = parseObject(
      outputFiles['tsconfig.json'],
    ) as TsConfigJson;

    expect(outputData).toMatchInlineSnapshot(`
      {
        "compilerOptions": {
          "baseUrl": ".",
          "lib": [
            "ES2020",
          ],
          "outDir": "lib",
          "paths": {
            "src": [
              "src",
            ],
          },
          "target": "ES2020",
        },
        "exclude": [
          ".idea",
          "lib*/**/*",
        ],
        "extends": "skuba/config/tsconfig.json",
      }
    `);
  });

  it('migrates divergent outDir', async () => {
    const inputFiles = {
      Dockerfile: `
ARG DIR dist

RUN echo redist

FROM gcr.io/distroless/nodejs:16 AS runtime

COPY --from=build /workdir/dist './dist'

CMD ["dist/listen.js"]
`,
      'tsconfig.json': '{"compilerOptions": {"outDir": "dist/"}}',
    };

    const outputFiles = await executeModule(
      tsconfigModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles.Dockerfile).toMatchInlineSnapshot(`
      "
      ARG DIR lib

      RUN echo redist

      FROM gcr.io/distroless/nodejs:16 AS runtime

      COPY --from=build /workdir/lib './lib'

      CMD ["lib/listen.js"]
      "
    `);

    const outputData = parseObject(
      outputFiles['tsconfig.json'],
    ) as TsConfigJson;

    assertDefined(outputData);
    expect(outputData.compilerOptions!.outDir).toBe('lib');
  });

  it('removes duplicate lib patterns from  exclude option', async () => {
    const inputFiles = {
      'tsconfig.json':
        '{"extends": "skuba/config/tsconfig.json", "exclude": ["lib", "lib/**/*"]}',
    };

    const outputFiles = await executeModule(
      tsconfigModule,
      inputFiles,
      defaultOpts,
    );

    const outputData = parseObject(
      outputFiles['tsconfig.json'],
    ) as TsConfigJson;

    assertDefined(outputData);
    expect(outputData.extends).toBe('skuba/config/tsconfig.json');
    expect(outputData.exclude).toStrictEqual(['lib*/**/*']);
  });

  it('retains include option after initial setup', async () => {
    const inputFiles = {
      'tsconfig.json':
        '{"extends": "skuba/config/tsconfig.json", "include": ["src"]}',
    };

    const outputFiles = await executeModule(
      tsconfigModule,
      inputFiles,
      defaultOpts,
    );

    const outputData = parseObject(
      outputFiles['tsconfig.json'],
    ) as TsConfigJson;

    assertDefined(outputData);
    expect(outputData.extends).toBe('skuba/config/tsconfig.json');
    expect(outputData.include).toStrictEqual(['src']);
  });
});
