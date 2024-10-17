import { existsSync } from "@std/fs"
import { dirname, fromFileUrl, join } from "@std/path"
import { UntarStream } from "@std/tar"

const __dirname = dirname(fromFileUrl(import.meta.url))

/**
 * Prints an error message and then exits program with an error signal.
 * @param {string | Error | Uint8Array} msg - message to be printed to the console
 */
const error = (msg: string | Error | Uint8Array) => {
  console.error(msg)
  Deno.exit(1)
}

/**
 * Binary class from the `binary-install` package, ported to use ESM and Deno APIs.
 * This class allows extraction of gunzipped (gzipped) binaries onto the file system.
 * As it requires access to the file system, any environment which does not provide this
 * is not a suitable extraction target.
 *
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
    const errors: string[] = []
    try {
      new URL(url)
    } catch (e: any) {
      errors.push(e)
    }

    if (!name) {
      errors.push("You must specify the name of your binary")
    }

    if (
      config && typeof config?.installDirectory !== "string"
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

    Deno.removeSync(this.installDirectory, { recursive: true })
    Deno.mkdirSync(this.installDirectory, { recursive: true })

    if (!suppressLogs) {
      console.log(`Downloading release from ${this.url}`)
    }

    try {
      const res = await fetch(this.url, { ...fetchOptions })
      if (!res.body) {
        throw new Error("Fetched URL has not body content")
      }

      // https://streams.spec.whatwg.org/#rs-asynciterator
      for await (
        const chunk of res.body
          .pipeThrough(new DecompressionStream("gzip"))
          .pipeThrough(new UntarStream())
      ) {
        const header = chunk.header

        // https://man.freebsd.org/cgi/man.cgi?query=tar&sektion=5&apropos=0&manpath=FreeBSD+15.0
        // typeflag - Type  of	entry.
        //   "0"   Regular file.
        //   "5"   Directory.
        if (header.typeflag === "0") {
          await chunk.readable?.pipeTo(
            (await Deno.create(this.binaryPath)).writable,
          )
          try {
            await Deno.chmod(this.binaryPath, 0o755)
          } catch (error) {
            console.error("Unable to set permissions", error)
          }
        }
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
        const options: Deno.CommandOptions = {
          args: Deno.args,
          cwd: Deno.cwd(),
        }

        const command = new Deno.Command(this.binaryPath, options)
        const result = command.outputSync()
        const decoder = new TextDecoder()

        if (!result.success) {
          console.error(decoder.decode(result.stderr))
        }

        console.log(decoder.decode(result.stdout))

        Deno.exit(result.code ?? undefined)
      })
      .catch((e: { message: string }) => {
        error(e.message)
        Deno.exit(1)
      })
  }
}

export { Binary }
