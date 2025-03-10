import { inspect } from 'util';

import memfs, { vol } from 'memfs';

import * as Git from '../../api/git';

import { tryPatchRenovateConfig } from './patchRenovateConfig';

jest.mock('fs-extra', () => memfs);

const JSON = `
{
  "extends": [
    "github>seek-oss/rynovate:third-party-major"
  ]
}
`;

const JSON5 = `
{
  extends: [
    // Preceding comment
    'seek',
    // Succeeding comment
  ]
}
`;

const JSON5_CONFIGURED = `{extends: ['github>seek-oss/rynovate', local>seek-jobs/renovate-config']}`;

const JSON5_EXTENDED = `{extends: ['github>seek-jobs/custom-config']}`;

const getOwnerAndRepo = jest.spyOn(Git, 'getOwnerAndRepo');

const consoleLog = jest.spyOn(console, 'log').mockImplementation();

const writeFile = jest.spyOn(memfs.fs.promises, 'writeFile');

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

beforeEach(jest.clearAllMocks);
beforeEach(() => vol.reset());

it('patches a JSON config for a SEEK-Jobs project', async () => {
  getOwnerAndRepo.mockResolvedValue({ owner: 'SEEK-Jobs', repo: 'VersionNet' });

  vol.fromJSON({ 'renovate.json': JSON });

  await expect(tryPatchRenovateConfig()).resolves.toBeUndefined();

  expect(volToJson()).toMatchInlineSnapshot(`
    {
      "renovate.json": "{
      "extends": [
        "local>seek-jobs/renovate-config",
        "github>seek-oss/rynovate:third-party-major"
      ]
    }
    ",
    }
  `);
});

it('patches a JSON5 config for a seekasia project', async () => {
  getOwnerAndRepo.mockResolvedValue({
    owner: 'sEEkAsIa',
    repo: 'VersionCobol',
  });

  vol.fromJSON({ '.github/renovate.json5': JSON5 });

  await expect(tryPatchRenovateConfig()).resolves.toBeUndefined();

  // Note that `golden-fleece` can't do any better than this imperfect output,
  // but at least it allows us to preserve the comments rather than dropping
  // them entirely.
  expect(volToJson()).toMatchInlineSnapshot(`
    {
      ".github/renovate.json5": "{
      extends: [
        // Preceding comment
        'local>seekasia/renovate-config',

        'seek',
        // Succeeding comment
      ],
    }
    ",
    }
  `);
});

it('handles a lack of Renovate config', async () => {
  getOwnerAndRepo.mockResolvedValue({ owner: 'SEEK-Jobs', repo: 'monolith' });

  await expect(tryPatchRenovateConfig()).resolves.toBeUndefined();

  expect(volToJson()).toStrictEqual({});
});

it('handles a filesystem error', async () => {
  const err = new Error('Badness!');

  writeFile.mockRejectedValueOnce(err);

  getOwnerAndRepo.mockResolvedValue({ owner: 'SEEK-Jobs', repo: 'VersionNet' });

  const files = { 'renovate.json5': JSON5 };

  vol.fromJSON(files);

  await expect(tryPatchRenovateConfig()).resolves.toBeUndefined();

  expect(volToJson()).toStrictEqual(files);

  expect(consoleLog).toHaveBeenCalledWith('Failed to patch Renovate config.');
  expect(consoleLog).toHaveBeenCalledWith(inspect(err));
});

it('handles a non-Git directory', async () => {
  const err = new Error('Badness!');

  getOwnerAndRepo.mockRejectedValue(err);

  await expect(tryPatchRenovateConfig()).resolves.toBeUndefined();

  expect(volToJson()).toStrictEqual({});

  expect(consoleLog).toHaveBeenCalledWith('Failed to patch Renovate config.');
  expect(consoleLog).toHaveBeenCalledWith(inspect(err));
});

it('skips a seek-oss project', async () => {
  getOwnerAndRepo.mockResolvedValue({ owner: 'seek-oss', repo: 'skuba' });

  const files = { 'renovate.json5': JSON5 };

  vol.fromJSON(files);

  await expect(tryPatchRenovateConfig()).resolves.toBeUndefined();

  expect(volToJson()).toStrictEqual(files);

  expect(writeFile).not.toHaveBeenCalled();
});

it('skips a personal project', async () => {
  getOwnerAndRepo.mockResolvedValue({ owner: 'Seekie1337', repo: 'fizz-buzz' });

  const files = { '.renovaterc': JSON };

  vol.fromJSON(files);

  await expect(tryPatchRenovateConfig()).resolves.toBeUndefined();

  expect(volToJson()).toStrictEqual(files);

  expect(writeFile).not.toHaveBeenCalled();
});

it('skips a strange config without `extends`', async () => {
  getOwnerAndRepo.mockResolvedValue({ owner: 'SEEK-Jobs', repo: 'monolith' });

  const files = { '.github/renovate.json5': '{}' };

  vol.fromJSON(files);

  await expect(tryPatchRenovateConfig()).resolves.toBeUndefined();

  expect(volToJson()).toStrictEqual(files);

  expect(writeFile).not.toHaveBeenCalled();
});

it('skips a configured SEEK-Jobs project', async () => {
  getOwnerAndRepo.mockResolvedValue({ owner: 'SEEK-Jobs', repo: 'monolith' });

  const files = { '.github/renovate.json5': JSON5_CONFIGURED };

  vol.fromJSON(files);

  await expect(tryPatchRenovateConfig()).resolves.toBeUndefined();

  expect(volToJson()).toStrictEqual(files);

  expect(writeFile).not.toHaveBeenCalled();
});

it('skips a SEEK-Jobs project which already extends a config', async () => {
  getOwnerAndRepo.mockResolvedValue({ owner: 'SEEK-Jobs', repo: 'monolith' });

  const files = { '.github/renovate.json5': JSON5_EXTENDED };

  vol.fromJSON(files);

  await expect(tryPatchRenovateConfig()).resolves.toBeUndefined();

  expect(volToJson()).toStrictEqual(files);

  expect(writeFile).not.toHaveBeenCalled();
});
