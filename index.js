const issueDB = require('issue-db')({
  owner: 'zeke',
  repo: 'new-words',
  token: 'fb774ce551c97c4b1cbfea59d66fe7bfda9850a7'
})

const html = require('choo/html')
const choo = require('choo')
const app = choo()
app.route('/', main)
app.mount('body')

function main () {
  return html`
    <body>
      <form onsubmit=${onsubmit}>
        <input type="text" name="word" placeholder="word" required>
        <input type="text" name="definition" placeholder="definition" required>
        <input type="text" name="context" placeholder="context">
        <input type="submit" value="Save">
      </form>
    </body>
  `

  function onsubmit (e) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    const headers = new Headers({ 'Content-Type': 'application/json' })
    const body = {}
    for (const pair of data.entries()) body[pair[0]] = pair[1]
    console.log(body)
  }
}