#!/bin/sh
cd "$(dirname "$0")"
command -v node >/dev/null 2>&1 || { echo "Node.js não encontrado. Instale a versão LTS em https://nodejs.org"; exit 1; }
if [ ! -f data/users.json ]; then
  echo "Primeira execução: vamos criar o usuário CONTROLADOR (quem edita tudo)."
  printf "Nome do usuário: "; read U
  printf "Senha (mínimo 6 caracteres): "; read P
  node server.js user add "$U" "$P" controlador
fi
node server.js setup
echo "Abra no navegador: http://localhost:3000"
node server.js
