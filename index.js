import { spawnSync, exec } from "node:child_process"
import { createWriteStream, existsSync, mkdirSync, rmSync } from "node:fs"
import { join, dirname } from "node:path"
import { Readable } from "node:stream"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * `rm -rf` analog
 */
const rimraf = function (dirPath) {
  if (existsSync(dirPath)) {
    rmSync(dirPath, { recursive: true, force: true })
  }
}

/**
 * Prints an error message and then exits program with an error signal.
 * @param {string} msg - message to be printed to the console
 */
const error = (msg) => {
  console.error(msg)
  process.exit(1)
}

/**
 * Modified version of Binary class from the binary-install package, to use ESM.
 *
 * Derived from https://www.npmjs.com/package/binary-install. See LICENSE.avery for license info.
 */
class Binary {
  /**
   * Constructor for the Binary class.
   * @param {string} name - package name
   * @param {string} url - location of the .tar.gz file for this package
   * @param {{installDirectory: string}=} config - config object containing install directory location
   */
  constructor(name, url, config) {
    let errors = []
    if (typeof url !== "string") {
      errors.push("url must be a string")
    } else {
      try {
        new URL(url)
      } catch (e) {
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
      config &&
      config.installDirectory &&
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
    this.installDirectory =
      config?.installDirectory || join(__dirname, "node_modules", ".bin")

    if (!existsSync(this.installDirectory)) {
      mkdirSync(this.installDirectory, { recursive: true })
    }

    this.binaryPath = join(this.installDirectory, `${this.name}`)
  }

  exists() {
    return existsSync(this.binaryPath)
  }

  async install(fetchOptions, suppressLogs = false) {
    if (this.exists()) {
      if (!suppressLogs) {
        console.error(
          `${this.name} is already installed, skipping installation.`
        )
      }
      return Promise.resolve()
    }

    rimraf(this.installDirectory)

    mkdirSync(this.installDirectory, { recursive: true })

    if (!suppressLogs) {
      console.log(`Downloading release from ${this.url}`)
    }

    let tar
    try {
      tar = await import("tar-stream")
    } catch {
      tar = undefined
      console.error('Using native tar binary for extraction.')
    }

    try {
      let res = await fetch(this.url, { ...fetchOptions })
      let gunzipper = new DecompressionStream("gzip")

      if (tar) {
        const extractor = tar.extract()

        const tarball = res.body.pipeThrough(gunzipper)
        Readable.fromWeb(tarball).pipe(extractor)

        // https://streams.spec.whatwg.org/#rs-asynciterator
        for await (const chunk of extractor) {
          let header = chunk.header

          if (header.type === "file") {
            chunk.pipe(createWriteStream(this.binaryPath, { mode: header.mode }))
          }
          chunk.resume()
        }
      } else {
        const tarfile = `${this.binaryPath}.tar`
        const stream = createWriteStream(tarfile)

        Readable.fromWeb(res.body.pipeThrough(gunzipper)).pipe(stream)
        exec(`tar -xf ${tarfile} -C ${this.installDirectory} --strip-components=1`)
      }
      if (!suppressLogs) {
        console.log(`${this.name} has been installed!`)
      }
    } catch (e) {
      return error(`Error fetching release: ${e.message}`)
    }
  }

  run(fetchOptions) {
    const promise = !this.exists()
      ? this.install(fetchOptions, true)
      : Promise.resolve()

    promise
      .then(() => {
        const [, , ...args] = process.argv

        const options = { cwd: process.cwd(), stdio: "inherit" }

        const result = spawnSync(this.binaryPath, args, options)

        if (result.error) {
          error(result.error)
        }

        process.exit(result.status)
      })
      .catch((e) => {
        error(e.message)
        process.exit(1)
      })
  }
}

export { Binary }
