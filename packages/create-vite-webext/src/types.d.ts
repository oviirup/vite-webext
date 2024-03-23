import type { Command } from 'commander';
import type { PromptObject } from 'prompts';

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

export type CLIArgs = {
  project: { name: string; path: string };
  framework?: string;
  packman?: PackageManager;
  javascript?: boolean;
  typescript?: boolean;
  tailwind?: boolean;
  skipInstall: boolean;
};

export type PromptOptions = {
  opt: CLIArgs;
  program: Command;
  prompts: <T extends string>(
    query: PromptObject<T>,
  ) => Promise<Record<T, any>>;
};

export type TemplateArgs = Required<CLIArgs>;
