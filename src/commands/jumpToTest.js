const vscode = require("vscode");
const validations = require("../helpers/validations");

function openFile(file) {
  return vscode.workspace
    .openTextDocument(vscode.Uri.file(file))
    .then(vscode.window.showTextDocument);
}

function showConfirmationDialog(text, button) {
  return vscode.window.showWarningMessage(text, { modal: true }, button);
}

async function getModuleName(uriFile) {
  const content = (await vscode.workspace.fs.readFile(uriFile)).toString();
  const moduleDefinition = content.match(/defmodule (.*) do/);

  return moduleDefinition[1];
}

async function createNewTestFile(dir, file) {
  const uriDir = vscode.Uri.file(dir);
  const uriFile = vscode.Uri.file(`${dir}${file}`);
  const ws = new vscode.WorkspaceEdit();

  const originalFile = vscode.window.activeTextEditor.document.fileName;
  const originalFileUri = vscode.Uri.file(originalFile);
  const moduleName = await getModuleName(originalFileUri);

  await vscode.workspace.fs.createDirectory(uriDir);

  ws.createFile(uriFile);
  ws.insert(
    uriFile,
    new vscode.Position(0, 0),
    `defmodule ${moduleName}Test do\n\tuse ExUnit.Case\n\tdoctest ${moduleName}\n\talias ${moduleName}\n\nend`
  );

  await vscode.workspace.applyEdit(ws);
}

function askToCreateANewFile(dir, file) {
  return showConfirmationDialog(
    `Create the test file at ${dir}?`,
    "Create"
  ).then((answer) => {
    if (answer === "Create") {
      createNewTestFile(dir, file).then(() => {
        openFile(`${dir}${file}`);
      });
    }
  });
}

function handler() {
  const activeFile = vscode.window.activeTextEditor;

  if (!activeFile) {
    return;
  }

  const openedFilename = activeFile.document.fileName;
  const openedFile = validations.isCodeFile(openedFilename);

  if (!openedFile) {
    return;
  }

  const startDir = openedFile[1];
  const testOrLib = openedFile[2];
  const postDir = openedFile[3];
  const fileName = openedFile[4];

  if (testOrLib === "lib") {
    let newFilename = "";

    if (fileName.includes(".test")) {
      const strippedFileName = fileName.replace(".test", "");
      newFilename = `${strippedFileName}.ex`;
    } else {
      newFilename = `${fileName}.test.exs`;
    }

    const fileToOpen = vscode.workspace.asRelativePath(
      startDir + testOrLib + postDir + newFilename,
      false
    );

    vscode.workspace.findFiles(fileToOpen, "**/.elixir_ls/**").then((files) => {
      if (!files.length) {
        askToCreateANewFile(startDir + testOrLib + postDir, newFilename);
      } else {
        const file = files[0].fsPath;
        openFile(file);
      }
    });
  } else {
    const replacedLibOrTest = testOrLib === "lib" ? "test" : "lib";
    let newFilename = "";

    if (fileName.includes("_test")) {
      const strippedFileName = fileName.replace("_test", "");
      newFilename = `${strippedFileName}.ex`;
    } else {
      newFilename = `${fileName}_test.exs`;
    }

    const fileToOpen = vscode.workspace.asRelativePath(
      startDir + replacedLibOrTest + postDir + newFilename,
      false
    );

    vscode.workspace.findFiles(fileToOpen, "**/.elixir_ls/**").then((files) => {
      if (!files.length) {
        askToCreateANewFile(
          startDir + replacedLibOrTest + postDir,
          newFilename
        );
      } else {
        const file = files[0].fsPath;
        openFile(file);
      }
    });
  }
}

module.exports = {
  name: "extension.elixirJumpToTest",
  handler,
};
