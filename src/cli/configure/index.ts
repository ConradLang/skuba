import path from 'path';

import { createInclusionFilter } from '../../utils/dir';
import { createExec, ensureCommands } from '../../utils/exec';
import { log } from '../../utils/logging';
import { showLogoAndVersionInfo } from '../../utils/logo';
import { BASE_TEMPLATE_DIR } from '../../utils/template';
import { hasProp } from '../../utils/validation';

import { analyseConfiguration } from './analyseConfiguration';
import { analyseDependencies } from './analyseDependencies';
import { auditWorkingTree } from './analysis/git';
import { getDestinationManifest } from './analysis/package';
import { ensureTemplateCompletion } from './ensureTemplateCompletion';
import { getEntryPoint } from './getEntryPoint';
import { getProjectType } from './getProjectType';

import { Select } from 'enquirer';

const shouldApply = async (name: string) => {
  const prompt = new Select({
    choices: ['yes', 'no'] as const,
    message: 'Apply changes?',
    name,
  });

  const result = await prompt.run();

  return result === 'yes';
};

export const configure = async () => {
  await showLogoAndVersionInfo();

  const [manifest] = await Promise.all([
    getDestinationManifest(),
    ensureCommands('yarn'),
  ]);

  const destinationRoot = path.dirname(manifest.path);

  log.plain('Detected project root:', log.bold(destinationRoot));

  const [include] = await Promise.all([
    createInclusionFilter([
      path.join(destinationRoot, '.gitignore'),
      path.join(BASE_TEMPLATE_DIR, '_.gitignore'),
    ]),

    auditWorkingTree(destinationRoot),
  ]);

  const templateConfig = await ensureTemplateCompletion({
    destinationRoot,
    include,
    manifest,
  });

  const type = await getProjectType({
    manifest,
    templateConfig,
  });

  const entryPoint = await getEntryPoint({
    destinationRoot,
    manifest,
    templateConfig,
    type,
  });

  const fixDependencies = await analyseDependencies({
    destinationRoot,
    include,
    manifest,
    type,
  });

  if (fixDependencies) {
    log.newline();

    if (await shouldApply('fixDependencies')) {
      await fixDependencies();
    }
  }

  const firstRun = hasProp(manifest.packageJson, 'skuba');

  const fixConfiguration = await analyseConfiguration({
    destinationRoot,
    entryPoint,
    firstRun,
    type,
  });

  if (fixConfiguration) {
    log.newline();

    if (await shouldApply('fixConfiguration')) {
      await fixConfiguration();
    }
  }

  if (fixDependencies) {
    const exec = createExec({
      stdio: 'pipe',
      streamStdio: 'yarn',
    });

    log.newline();
    try {
      await exec('yarn', 'install');
    } catch {
      log.newline();
      log.warn(log.bold('✗ Failed to install dependencies. Resume with:'));

      log.newline();
      log.plain(log.bold('yarn install'));
      log.plain(log.bold('yarn format'));

      log.newline();
      process.exitCode = 1;
      return;
    }
    try {
      await exec('npx', 'yarn-deduplicate', '--strategy=highest');
    } catch {}
  }

  if (fixConfiguration || fixDependencies) {
    log.newline();
    log.ok(log.bold('✔ All done! Try running:'));

    log.newline();
    log.plain(log.bold('yarn format'));
  }

  log.newline();
};
