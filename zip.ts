
import { createWriteStream } from 'fs'
import { readdir, readFile, stat } from 'fs/promises'
import { join } from 'path'
import { createGzip } from 'zlib'

const zipDirectory = async (source: string, out: string) => {
  const archive = createWriteStream(out);
  const zip = createGzip();

  const addDirectory = async (sourcePath, zipStream) => {
    const files = await readdir(sourcePath);
    for (const file of files) {
      const filePath = join(sourcePath, file);
      const fileStat = await stat(filePath);

      if (fileStat.isFile()) {
        const fileContents = await readFile(filePath);
        zipStream.write(fileContents);
      } else if (fileStat.isDirectory()) {
        await addDirectory(filePath, zipStream);
      }
    }
  };

  zip.pipe(archive);
  await addDirectory(source, zip);
  zip.end();
}

zipDirectory('.idea', 'packages.zip')