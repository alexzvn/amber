---
title: Getting Started
outline: deep
---

# Introduction

Amber simplifies the development of browser extensions by providing a streamlined toolchain that works seamlessly with JavaScript/TypeScript.

## Installation

1. To create new scaffold development project, run one of following command:

:::code-group
```sh [npm]
npm create amber@latest my-extension
```

```sh [yarn]
yarn create amber my-extension
```

```sh [pnpm]
pnpm create amber my-extension
```

```sh [bun]
bun create amber my-extension
```
:::


2. Go to your created folder

```sh
cd my-extension
```

3. Start development process


:::code-group
```sh [npm]
npm run dev
```

```sh [yarn]
yarn dev
```

```sh [pnpm]
pnpm dev
```

```sh [bun]
bun dev
```
:::

After run dev command, you should see `dist` folder located on root of the project.

## Loading extension to Chrome browser

First, you need go to chrome extension management via url `chrome://extensions`. You could copy and paste it on new tab.

![Enable development mode](/assets/enable-dev-mode-2.png)

Choice `Load Unpacked` then located `dist` folder inside the project and then you should see new extension added.

> [!IMPORTANT]
> Without development phrase, you may not see it working because extension rely on dev server. If you're ready to publish, please refer to build extension before hand.