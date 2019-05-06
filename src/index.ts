/**
 * Copyright © 2019 kevinpollet <pollet.kevin@gmail.com>`
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE.md file.
 */

import yargs from "yargs";
import http2 from "http2";
import { URL } from "url";
import { formatHttpHeaders } from "./formatHttpHeaders";
import { toOutgoingHeaders } from "./toOutgoingHeaders";
import { emptyReadable } from "./emptyReadable";
import { isErrorStatusCode } from "./isErrorStatusCode";
import { AuthenticationType } from "./AuthenticationType";

const { method, url, verbose, auth, "auth-type": authType, insecure } = yargs
  .showHelpOnFail(true)
  .help()
  .wrap(null)
  .command("$0 <method> <url>", "", yargs =>
    yargs
      .parserConfiguration({ "dot-notation": true })
      .positional("method", {
        choices: ["DELETE", "GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH"],
        coerce: (method: string) => method.toUpperCase(),
        type: "string",
      })
      .positional("url", {
        coerce: (url: string) => new URL(url),
      })
      .option("auth", {
        description: "The authentication credentials",
        type: "string",
      })
      .option("auth-type", {
        choices: [AuthenticationType.Basic, AuthenticationType.Bearer],
        coerce: authType => authType as AuthenticationType,
        default: AuthenticationType.Basic,
        description: "The authentication type",
      })
      .option("insecure", {
        description: "Disable the server certificate verification",
        type: "boolean",
      })
      .option("verbose", {
        description: "Display the HTTP response headers",
        type: "boolean",
      })
  ).argv;

const { origin, pathname: path } = url as URL;

http2.connect(origin, { rejectUnauthorized: !!insecure }, session => {
  const stdinStream = process.stdin.isTTY ? emptyReadable : process.stdin;
  const http2Stream = session.request(
    toOutgoingHeaders({
      auth: auth ? { type: authType, credentials: auth } : undefined,
      method: method as string,
      path,
    })
  );

  http2Stream.on("response", headers => {
    const statusCode = parseInt(headers[":status"] as string);
    const isError = isErrorStatusCode(statusCode);
    const outputStream = isErrorStatusCode ? process.stderr : process.stdout;

    if (verbose) {
      process.stdout.write(formatHttpHeaders(headers));
    }

    http2Stream
      .on("end", () => {
        session.destroy();
        process.exit(isError ? 1 : 0);
      })
      .pipe(outputStream);
  });

  stdinStream.pipe(http2Stream);
});
