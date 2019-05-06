/**
 * Copyright © 2019 kevinpollet <pollet.kevin@gmail.com>`
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE.md file.
 */

import { Readable } from "stream";

export const emptyReadable = new Readable({
  read() {
    this.push(null);
  },
});
