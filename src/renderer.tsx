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
      </div>
      </body>
    </html>
  )
})
