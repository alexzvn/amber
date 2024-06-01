import BackgroundScript from './BackgroundScript'
import ContentScript from './ContentScript'
import Page from './Page'


export const getMapModule = () => {
  const inputs = {} as Record<string, string>

  for (const script of ContentScript.$registers) {
    if (script.options.format === 'es') {
      inputs[script.moduleName] = script.file
    }
  }

  for (const page of Page.$registers) {
    inputs[page.path.name!] = page.file
  }

  for (const script of BackgroundScript.$registers) {
    inputs[script.path.name!] = script.file
  }

  return inputs
}

export const getDevMapModule = () => {
  const inputs = getMapModule()

  for (const script of ContentScript.$registers) {
    if (script.options.format === 'iife') {
      inputs[script.moduleName] = script.file
    }
  }

  return inputs
}

export const getMapIIFE = () => {
  const inputs = {} as Record<string, string>

  for (const script of ContentScript.$registers) {
    if (script.options.format === 'iife') {
      inputs[script.moduleName] = script.file
    }
  }

  return inputs
}