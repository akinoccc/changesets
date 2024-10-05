import { Changeset } from "@changesets/types";
import fs from "node:fs/promises";
import humanId from "human-id";
import path from "path";
import prettier from "prettier";

function getPrettierInstance(cwd: string): typeof prettier {
  try {
    return require(require.resolve("prettier", { paths: [cwd] }));
  } catch (err) {
    if (!err || (err as any).code !== "MODULE_NOT_FOUND") {
      throw err;
    }
    return prettier;
  }
}

async function writeChangeset(
  changeset: Changeset,
  cwd: string
): Promise<string> {
  const { summary, releases } = changeset;

  const changesetBase = path.resolve(cwd, ".changeset");

  // Worth understanding that the ID merely needs to be a unique hash to avoid git conflicts
  // experimenting with human readable ids to make finding changesets easier
  const changesetID = humanId({
    separator: "-",
    capitalize: false,
  });

  const prettierInstance = getPrettierInstance(cwd);
  const newChangesetPath = path.resolve(changesetBase, `${changesetID}.md`);

  // NOTE: The quotation marks in here are really important even though they are
  // not spec for yaml. This is because package names can contain special
  // characters that will otherwise break the parsing step
  const changesetContents = `---
${releases.map((release) => `"${release.name}": ${release.type}`).join("\n")}
---

${summary}
  `;

  await fs.mkdir(path.dirname(newChangesetPath), { recursive: true });
  await fs.writeFile(
    newChangesetPath,
    // Prettier v3 returns a promise
    await prettierInstance.format(changesetContents, {
      ...(await prettierInstance.resolveConfig(newChangesetPath)),
      parser: "markdown",
    })
  );

  return changesetID;
}

export default writeChangeset;
