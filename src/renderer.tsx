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
        Use of <em>Whateverify</em> is subject to the Cloudflare Website and Online Services <a href="https://www.cloudflare.com/website-terms/">Terms of Use</a> and <a href="https://www.cloudflare.com/privacypolicy/">Privacy Policy</a>
      </div>
      </body>
    </html>
  )
})
