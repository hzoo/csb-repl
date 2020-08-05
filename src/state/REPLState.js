// convert a Unicode string to a string in which
// each 16-bit unit occupies only one byte
// source: https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/btoa
function toBinary(string) {
  const codeUnits = new Uint16Array(string.length);
  for (let i = 0; i < codeUnits.length; i++) {
    codeUnits[i] = string.charCodeAt(i);
  }
  return String.fromCharCode(...new Uint8Array(codeUnits.buffer));
}

// source: https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/btoa
function fromBinary(binary) {
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return String.fromCharCode(...new Uint16Array(bytes.buffer));
}

/**
 * encodeToBase64 encodes any string to base64.
 * @param {string} jsSource
 * @returns {string} base64 js string.
 */
function encodeToBase64(jsSource) {
  const binString = toBinary(jsSource);
  return btoa(binString);
}

/**
 * decodeBase64 decodes a base64 string to
 * js code.
 * @param {string} base64String
 * @returns {string} the original js source.
 */
function decodeBase64(base64String) {
  const decoded = atob(base64String);
  return fromBinary(decoded);
}

class REPLState {
  /**
   * The REPLState constructor takes in what the App component provides with the exception of the configs.
   * Those must be turned into strings before calling the constructor.
   * @param {string} jsSource
   * @param {string} pluginSource
   * @param {string[]} configs
   */
  constructor(jsSource, pluginSource, configs) {
    this.jsSource = jsSource;
    this.pluginSource = pluginSource;
    this.configs = configs;
  }

  /**
   * Encode returns an encoded version of the REPL State
   * as a string.
   * @returns {string}
   */
  Encode() {
    return JSON.stringify({
      source: encodeToBase64(this.jsSource),
      plugin: encodeToBase64(this.pluginSource),
      configs: this.configs.map(configSrc => {
        return encodeToBase64(configSrc);
      }),
    });
  }

  /**
   * Decode decodes the json string.
   * @param {string} encodedState
   * @returns {REPLState}
   */
  static Decode(encodedState) {
    let jsonState = JSON.parse(encodedState);
    return new REPLState(
      decodeBase64(jsonState.base64SourceKey),
      decodeBase64(jsonState.base64PluginKey),
      jsonState.configIDs.map(configs => {
        return decodeBase64(configs);
      })
    );
  }

  /**
   * Link gets the sharing the sharing link
   * for the given REPL state.
   * @returns {Promise<string>} String URL.
   */
  async Link() {
    const url = `/api/v1/blobs/create`;
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: this.Encode(),
      });
      const message = await resp.json();

      // https://stackoverflow.com/questions/6941533/get-protocol-domain-and-port-from-url
      return (
        window.location.href.split("/").slice(0, 3).join("/") + message.url
      );
    } catch (err) {
      console.error(err);
      return err;
    }
  }

  /**
   * REPLState.FromID returns a REPLState given a unique identifier.
   * @param {string} ID
   * @returns {Promise<REPLState | null>}
   */
  static async FromID(ID) {
    const url = `/api/v1/blobs/${ID}`;
    try {
      const resp = await fetch(url);
      const text = await resp.text();
      return REPLState.Decode(text);
    } catch (err) {
      console.error(err);
      return null;
    }
  }
}

export default REPLState;