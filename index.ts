import { existsSync } from "@std/fs"
import { dirname, fromFileUrl, join } from "@std/path"
import { createWriteStream } from "node:fs"
import { Readable } from "node:stream"
import type { ReadableStream } from "node:stream/web"
import { extract } from "tar-stream"

const __dirname = dirname(fromFileUrl(import.meta.url))

/**
 * `rm -rf` analog
 */
const rimraf = function (dirPath: string) {
  if (existsSync(dirPath)) {
    Deno.removeSync(dirPath, { recursive: true })
  }
}

/**
 * Prints an error message and then exits program with an error signal.
 * @param {string | Error | Uint8Array} msg - message to be printed to the console
 */
const error = (msg: string | Error | Uint8Array) => {
  console.error(msg)
  Deno.exit(1)
}

/**
 * Modified version of Binary class from the binary-install package, to use ESM.
 *
 * Derived from https://www.npmjs.com/package/binary-install. See LICENSE.avery for license info.
 */
class Binary {
  url: string
  name: string
  installDirectory: string
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
    const errors: string[] = []
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
      Deno.mkdirSync(this.installDirectory, { recursive: true })
    }

    this.binaryPath = join(this.installDirectory, `${this.name}`)
  }

  exists() {
    return existsSync(this.binaryPath)
  }

  async install(fetchOptions: RequestInit, suppressLogs = false) {
    if (this.exists()) {
      if (!suppressLogs) {
        console.error(
          `${this.name} is already installed, skipping installation.`,
        )
      }
      return Promise.resolve()
    }

    rimraf(this.installDirectory)

    Deno.mkdirSync(this.installDirectory, { recursive: true })

    if (!suppressLogs) {
      console.log(`Downloading release from ${this.url}`)
    }

    try {
      const res = await fetch(this.url, { ...fetchOptions })
      if (!res.body) {
        throw new Error("Fetched URL has not body content")
      }

      const gunzipper = new DecompressionStream("gzip")

      const extractor = extract()

      // assert that type is ReadableStream<Uint8Array>, instead of globalThis.ReadableStream<Uint8Array>
      const tarball = res.body.pipeThrough(gunzipper) as ReadableStream<
        Uint8Array
      >
      tarball && Readable.fromWeb(tarball).pipe(extractor)

      // https://streams.spec.whatwg.org/#rs-asynciterator
      for await (const chunk of extractor) {
        const header = chunk.header

        if (header.type === "file") {
          chunk.pipe(createWriteStream(this.binaryPath, { mode: header.mode }))
        }
        chunk.resume()
      }

      if (!suppressLogs) {
        console.log(`${this.name} has been installed!`)
      }
    } catch (e: any) {
      return error(`Error fetching release: ${e?.message}`)
    }
  }

  run(fetchOptions: RequestInit) {
    const promise = !this.exists()
      ? this.install(fetchOptions, true)
      : Promise.resolve()

    promise
      .then(() => {
        const options: Deno.CommandOptions = {
          args: Deno.args,
          cwd: Deno.cwd(),
        }

        const command = new Deno.Command(this.binaryPath, options)
        const result = command.outputSync()

        if (!result.success) {
          error(result.stderr)
        }

        Deno.exit(result.code ?? undefined)
      })
      .catch((e) => {
        error(e.message)
        Deno.exit(1)
      })
  }
}

export { Binary }
