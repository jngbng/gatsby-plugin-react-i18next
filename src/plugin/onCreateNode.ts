import crypto from 'crypto';
import {CreateNodeArgs, Node} from 'gatsby';
import {FileSystemNode, PluginOptions, LocaleNodeInput} from '../types';

export function unstable_shouldOnCreateNode({node}: {node: Node}) {
  // We only care about JSON content.
  return node.internal.mediaType === `application/json`;
}

export const onCreateNode = async (
  {node, actions, loadNodeContent, reporter}: CreateNodeArgs<FileSystemNode>,
  pluginOptions: PluginOptions
) => {
  if (!unstable_shouldOnCreateNode({node})) {
    return;
  }

  const {
    absolutePath,
    internal: {mediaType, type},
    sourceInstanceName,
    relativeDirectory,
    name,
    id
  } = node;

  if (pluginOptions.sourceInstanceName == null) {
    return;
  }

  const {createNode, createParentChildLink} = actions;

  const targetSourceInstanceName = pluginOptions.sourceInstanceName;

  if (type !== 'File' || sourceInstanceName !== targetSourceInstanceName) {
    return;
  }

  const activity = reporter.activityTimer(
    `gatsby-plugin-react-i18next: create node: ${relativeDirectory}/${name}`
  );
  activity.start();

  const content = await loadNodeContent(node);
  let data: string;
  try {
    data = JSON.stringify(JSON.parse(content), undefined, '');
  } catch {
    const hint = node.absolutePath ? `file ${node.absolutePath}` : `in node ${node.id}`;
    throw new Error(`Unable to parse JSON: ${hint}`);
  }

  const contentDigest = crypto.createHash(`md5`).update(content).digest(`hex`);

  const localeNode: LocaleNodeInput = {
    id: `${id} >>> Locale`,
    children: [],
    parent: id,
    internal: {
      content,
      contentDigest,
      type: `Locale`
    },
    lng: relativeDirectory,
    ns: name,
    data,
    fileAbsolutePath: absolutePath
  };

  createNode(localeNode);

  // @ts-ignore
  // staled issue: https://github.com/gatsbyjs/gatsby/issues/19993
  createParentChildLink({parent: node, child: localeNode});

  activity.end();
};
