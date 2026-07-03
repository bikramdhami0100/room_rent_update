#!/bin/bash
set -e

echo "=== Installing Docker ==="
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

echo "=== Adding user to docker group ==="
sudo usermod -aG docker $USER
newgrp docker

echo "=== Cloning repo ==="
git clone https://github.com/YOUR_USERNAME/room_rent_update.git ~/room_rent_update
cd ~/room_rent_update

echo "=== Setting up environment file ==="
cat > .env << 'EOF'
MONGODB_URI=mongodb://mongo:27017/roomrental
AUTH_SECRET=your-auth-secret-here
AUTH_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
EOF

echo ""
echo "=== IMPORTANT: Edit .env with your real values ==="
echo "  nano ~/room_rent_update/.env"
echo ""
echo "=== To get SSL cert (replace with your domain): ==="
echo "  docker compose run --rm --entrypoint certbot certbot/certbot certonly --webroot -w /var/www/certbot -d your-domain.com"
echo ""
echo "=== Then start the app: ==="
echo "  cd ~/room_rent_update && docker compose up -d"
