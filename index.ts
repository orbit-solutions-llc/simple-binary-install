import {
  spawnSync,
  type SpawnSyncOptionsWithStringEncoding,
} from "node:child_process"
import { createWriteStream, existsSync, mkdirSync, rmSync } from "node:fs"
import { dirname, join } from "node:path"
import { Readable } from "node:stream"
import type { ReadableStream } from "node:stream/web"
import { fileURLToPath } from "node:url"
// @deno-types="npm:@types/tar-stream"
import { extract } from "tar-stream"

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * `rm -rf` analog
 */
const rimraf = function (dirPath: string) {
  if (existsSync(dirPath)) {
    rmSync(dirPath, { recursive: true, force: true })
  }
}

/**
 * Prints an error message and then exits program with an error signal.
 * @param {string | Error} msg - message to be printed to the console
 */
const error = (msg: string | Error) => {
  console.error(msg)
  process.exit(1)
}

/**
 * Binary class from the `binary-install` package, ported to use ESM and Deno APIs.
 * This class allows extraction of gunzipped (gzipped) binaries onto the file system.
 * As it requires access to the file system, any environment which does not provide this
 * is not a suitable extraction target. *
 * Derived from https://www.npmjs.com/package/binary-install. See LICENSE.avery for license info.
 */
class Binary {
  /** name of package to install */
  url: string
  /** location of the **.tar.gz** file for this package */
  name: string
  /** parent directory for the extracted binary  */
  installDirectory: string
  /** full location to the extracted binary on the file system */
  binaryPath: string

  /**
   * Constructor for the Binary class.
   * @param {string} name - package name
   * @param {string} url - location of the .tar.gz file for this package
   * @param {{installDirectory: string}=} config - config object containing install directory location
   */
  constructor(
    name: string,
    url: string,
    config?: { installDirectory: string },
  ) {
    let errors: string[] = []
    if (typeof url !== "string") {
      errors.push("url must be a string")
    } else {
      try {
        new URL(url)
      } catch (e: any) {
        errors.push(e)
      }
    }
    if (name && typeof name !== "string") {
      errors.push("name must be a string")
    }

    if (!name) {
      errors.push("You must specify the name of your binary")
    }

    if (
      config?.installDirectory &&
      typeof config.installDirectory !== "string"
    ) {
      errors.push("config.installDirectory must be a string")
    }

    if (errors.length > 0) {
      let errorMsg =
        "One or more of the parameters you passed to the Binary constructor are invalid:\n"
      errors.forEach((error) => {
        errorMsg += error
      })
      errorMsg +=
        '\n\nCorrect usage: new Binary("my-binary", "https://example.com/binary/download.tar.gz")'
      error(errorMsg)
    }
    this.url = url
    this.name = name
    this.installDirectory = config?.installDirectory ||
      join(__dirname, "node_modules", ".bin")

    if (!existsSync(this.installDirectory)) {
      mkdirSync(this.installDirectory, { recursive: true })
    }

    this.binaryPath = join(this.installDirectory, `${this.name}`)
  }

  /** checks if binary installation path already exists */
  exists(): boolean {
    return existsSync(this.binaryPath)
  }

  /** downloads, extracts and installs binary from given location on the web */
  async install(
    fetchOptions: RequestInit,
    suppressLogs = false,
  ): Promise<void> {
    if (this.exists()) {
      if (!suppressLogs) {
        console.error(
          `${this.name} is already installed, skipping installation.`,
        )
      }
      return Promise.resolve()
    }

    rimraf(this.installDirectory)

    mkdirSync(this.installDirectory, { recursive: true })

    if (!suppressLogs) {
      console.log(`Downloading release from ${this.url}`)
    }

    try {
      let res = await fetch(this.url, { ...fetchOptions })
      let gunzipper = new DecompressionStream("gzip")

      const extractor = extract()

      const tarball = res.body?.pipeThrough(gunzipper) as ReadableStream
      tarball && Readable.fromWeb(tarball).pipe(extractor)

      // https://streams.spec.whatwg.org/#rs-asynciterator
      for await (const chunk of extractor) {
        let header = chunk.header

        if (header.type === "file") {
          chunk.pipe(createWriteStream(this.binaryPath, { mode: header.mode }))
        }
        chunk.resume()
      }

      if (!suppressLogs) {
        console.log(`${this.name} has been installed!`)
      }
    } catch (e: any) {
      return error(`Error fetching release: ${e.message}`)
    }
  }

  run(fetchOptions: RequestInit): void {
    const promise = !this.exists()
      ? this.install(fetchOptions, true)
      : Promise.resolve()

    promise
      .then(() => {
        const [, , ...args] = process.argv

        const options: SpawnSyncOptionsWithStringEncoding = {
          cwd: process.cwd(),
          stdio: "inherit",
          encoding: "utf-8",
        }

        const result = spawnSync(this.binaryPath, args, options)

        if (result.error) {
          error(result.error)
        }

        process.exit(result.status ?? undefined)
      })
      .catch((e) => {
        error(e.message)
        process.exit(1)
      })
  }
}

export { Binary }
