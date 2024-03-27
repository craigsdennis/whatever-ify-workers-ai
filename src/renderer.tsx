import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children, title }) => {
  return (
    <html>
      <head>
        <link href="/static/style.css" rel="stylesheet" />
        <title>{title}</title>
      </head>
      <body>{children}
      <div class="footer">
        <p>Built with 🧡 on Cloudflare <a href="https://ai.cloudflare.com">Workers AI</a></p>

        <p>Use of <em>Whateverify</em> is subject to the Cloudflare Website and Online Services <a href="https://www.cloudflare.com/website-terms/">Terms of Use</a> and <a href="https://www.cloudflare.com/privacypolicy/">Privacy Policy</a></p>
      </div>
      </body>
    </html>
  )
})
