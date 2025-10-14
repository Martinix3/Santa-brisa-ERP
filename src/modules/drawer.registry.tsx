import type { ReactNode } from "react";

export type DrawerCtx = {
  module: string;
  path: string;
  entity: string;
  [key: string]: any;
};

export type DrawerPlugin = {
  id: string;
  when: (ctx: DrawerCtx) => boolean;
  actions?: (props: any) => ReactNode;
  tabs?: (props: any) => ReactNode;
  content?: (props: any) => ReactNode;
  footer?: (props: any) => ReactNode;
};

const plugins: DrawerPlugin[] = [];

export function register(plugin: DrawerPlugin) {
  plugins.push(plugin);
}

export function resolve(ctx: DrawerCtx): DrawerPlugin[] {
  return plugins.filter((p) => p.when(ctx));
}

export function getPlugins() {
  return plugins;
}
