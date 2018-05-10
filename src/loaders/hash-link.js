import path from 'path';
import transformLinks from 'transform-markdown-links';
import { getOptions } from 'loader-utils';

export default function(source) {
  const options = getOptions(this);
  const markdown = transformLinks(source, link => {
    if (link.includes('http')) {
      return link;
    }

    const pathToThisSource = path.dirname(path.resolve(this.resourcePath));

    if (path.extname(link).includes('.md')) {
      const pathToLink = path.join(pathToThisSource, link);
      const pathToDocs = path.join(process.cwd(), options.src);
      const correctPath = path.relative(pathToDocs, pathToLink);
      return path.join('#', correctPath);
    }

    const [filePath, ...description] = link.split(' ');
    const pathToLink = path.join(pathToThisSource, filePath);
    const correctPath = path.relative(process.cwd(), pathToLink);

    return `${correctPath} ${description.join(' ')}`;
  });

  return markdown;
}
