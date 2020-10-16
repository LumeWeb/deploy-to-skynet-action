const core = require("@actions/core");
const github = require("@actions/github");
const { SkynetClient } = require("@nebulous/skynet");
const { parseSkylink } = require("skynet-js");
const base64 = require("base64-js");
const base32Encode = require("base32-encode");

function decodeBase64(input = "") {
  return base64.toByteArray(
    input.padEnd(input.length + 4 - (input.length % 4), "=")
  );
}

function encodeBase32(input) {
  return base32Encode(input, "RFC4648-HEX", {
    padding: false,
  }).toLowerCase();
}

(async () => {
  try {
    // upload to skynet
    const skynetClient = new SkynetClient();
    const skylink = await skynetClient.uploadDirectory(
      core.getInput("upload-dir")
    );
    core.setOutput("skylink", skylink);
    console.log(`Skylink: ${skylink}`);

    // put a skylink in a pull request comment if available
    if (github.context.issue.number) {
      const gitHubToken = core.getInput("github-token");
      const octokit = github.getOctokit(gitHubToken);

      // generate base32 skylink from base64 skylink
      const skylinkDecoded = decodeBase64(parseSkylink(skylink));
      const skylinkEncodedBase32 = encodeBase32(skylinkDecoded);

      console.log(github.context.issue);
      console.log(github.context.issue.number);
      console.log(github.context);

      await octokit.issues.createComment({
        ...github.context.repo,
        issue_number: github.context.issue.number,
        body: `Deployed to https://${skylinkEncodedBase32}.siasky.net<br>Skylink: \`${skylink}\``,
      });
    }
  } catch (error) {
    core.setFailed(error.message);
  }
})();
