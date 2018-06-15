import 'babel-polyfill'
import getIpfs from 'window.ipfs-fallback'
import url from 'url'
import crypto from 'libp2p-crypto'

let ipfs

const setup = async () => {
  const parts = url.parse(window.location.href, true)
  const query = parts.query
  const button = document.getElementById('cryptofy')
  const message = document.getElementById('message')
  const password = document.getElementById('password')
  const output = document.getElementById('output')
  const base = window.location.origin + window.location.pathname
  const isDecrypting = Object.keys(query).length > 0

  // Modify share links with _this_ url
  for (let element of document.getElementsByClassName('linkable')) {
    element.href = element.href + encodeURI(base)
  }
  try {
    ipfs = await getIpfs()
    const addr = '/dns4/ipfs.carsonfarmer.com/tcp/9999/ws/ipfs/QmQqBfDcAre7CaTMmMzHqnrHPxX3xVT5D5GaiHh4zppTL7'
    const success = await ipfs.swarm.connect(addr)
    // Show button when ready
    if (isDecrypting) {
      button.innerHTML = 'Decrypt'
      const file = (await ipfs.files.get(`/ipfs/${query.cid}`))[0]
      const content = file.content.toString('base64')
      document.getElementById('message').value = content
    }
    button.style.visibility = 'visible'
    button.addEventListener('click', (e) => {
      output.innerHTML = ''
      if (!password.validity.valid) {
        return
      }
      e.preventDefault()
      // Compute a derived key to use in AES encryption algorithm
      // We aren't ever storing passwords, so no need to worry about salt
      const key = crypto.pbkdf2(password.value, 'encryptoid', 5000, 24, 'sha2-256')
      // We're only using the key once, so a fixed IV should be ok
      const iv = Buffer.from([...Array(16).keys()])
      // Create AES encryption object
      crypto.aes.create(Buffer.from(key), iv, (err, cipher) => {
        if (!err) {
          if (isDecrypting) {
            cipher.decrypt(Buffer.from(message.value, 'base64'), async (err, plaintext) => {
              if (!err) {
                const info = `Your super secret message is:
                `
                const msg = `${plaintext.toString('utf-8')}`
                output.innerText = info + '"' + msg + '"'
              }
            })
          } else {
            cipher.encrypt(Buffer.from(message.value), async (err, encrypted) => {
              if (!err) {
                const hashed = (await ipfs.files.add(encrypted))[0]
                const info = `Send the following link to your recipient, and get social down below:<br/><br/>`
                const msg = `<a href="${base}?cid=${hashed.hash}">${hashed.hash}</a>`
                output.innerHTML = info + msg
              }
            })
          }
        }
      })
    })
  } catch (err) {
    console.log(err)
  }
}
setup()
