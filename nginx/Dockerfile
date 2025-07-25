# This Dockerfile is for the reverse proxy NGINX container
FROM nginx:stable-alpine

# Copy main nginx config (global directives)
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf

# Remove default config if it exists to avoid Welcome page
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy individual server blocks for frontend and backend
COPY ./nginx/frontend.conf /etc/nginx/conf.d/frontend.conf
COPY ./nginx/backend.conf /etc/nginx/conf.d/backend.conf

# Expose HTTPS and HTTP ports
EXPOSE 80
EXPOSE 443

# Start nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
