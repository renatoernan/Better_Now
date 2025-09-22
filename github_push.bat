@echo off
chcp 65001 > nul
REM =========================================================
REM  SCRIPT PARA ENVIAR SEU PROJETO PARA O GITHUB - DIAGNÓSTICO FINAL
REM =========================================================

REM ATENÇÃO:
REM 1. Certifique-se de ter o Git instalado no seu sistema.
REM 2. *** Autenticação GitHub: ***
REM    O GitHub não aceita mais senhas de conta via linha de comando para autenticação HTTPS.
REM    Você DEVE usar um Personal Access Token (PAT).
REM    Se for solicitado, use seu nome de usuário GitHub e o PAT como sua senha.
REM    Crie seu PAT aqui: https://github.com/settings/tokens (selecione o escopo 'repo' para total acesso)
REM    Guarde o PAT em segurança, pois ele só é exibido uma vez.

echo.
echo =========================================================
echo  INÍCIO DO PROCESSO DE ENVIO PARA O GITHUB
echo =========================================================
echo.

REM 1. DEFINE O DIRETÓRIO DO SEU PROJETO LOCAL
set "PROJECT_DIR=C:\Users\renat\OneDrive\CESIRE\Cesire\Aplicativos\Better_Now"

REM 2. DEFINE A URL DO SEU REPOSITÓRIO GITHUB REMOTO
set "GITHUB_REPO_URL=https://github.com/renatoernan/Better_Now.git"

REM --- VERIFICAÇÕES INICIAIS ---
if not exist "%PROJECT_DIR%" (
    echo ERRO: O diretório do projeto não foi encontrado: %PROJECT_DIR%
    echo Verifique o caminho especificado e tente novamente.
    echo Pressione qualquer tecla para sair...
    pause
    exit /b 1
)

if "%GITHUB_REPO_URL%"=="" (
    echo ERRO: A URL do seu repositório GitHub NAO foi definida no script.
    echo Por favor, edite este arquivo .bat e insira a URL correta em GITHUB_REPO_URL.
    echo Pressione qualquer tecla para sair...
    pause
    exit /b 1
)

echo Navegando para o diretório do projeto: %PROJECT_DIR%
cd /d "%PROJECT_DIR%"
if %errorlevel% neq 0 (
    echo ERRO: Não foi possível navegar para o diretório do projeto.
    echo Pressione qualquer tecla para sair...
    pause
    exit /b %errorlevel%
)

REM 3. INICIALIZA OU GARANTE A CONFIGURAÇÃO DO REPOSITÓRIO GIT LOCAL
if not exist ".git" (
    echo Inicializando um novo repositório Git...
    git init --initial-branch=main
    if %errorlevel% neq 0 (
        echo ERRO ao inicializar o repositório Git.
        echo Pressione qualquer tecla para sair...
        pause
        exit /b %errorlevel%
    )
) else (
    echo Repositório Git ja inicializado.
    REM Garante que o branch principal seja 'main'
    git branch -M main
    if %errorlevel% neq 0 (
        echo ERRO ao garantir o branch 'main'.
        echo Pressione qualquer tecla para sair...
        pause
        exit /b %errorlevel%
    )
)

echo Adicionando todos os arquivos alterados/novos ao staging area...
git add .
if %errorlevel% neq 0 (
    echo ERRO ao adicionar arquivos ao staging area.
    echo Pressione qualquer tecla para sair...
    pause
    exit /b %errorlevel%
)

echo Criando commit das alteracoes...
git commit -m "Atualizacao automatica via script BAT"
REM O comando git commit retorna 0 mesmo se nao houver alteracoes.

REM 4. ADICIONA OU VERIFICA O REPOSITÓRIO REMOTO (ORIGIN)
echo Verificando configuracao do repositorio remoto 'origin'...
git remote show origin >nul 2>&1
if %errorlevel% neq 0 (
    echo Adicionando repositorio remoto 'origin' com a URL: %GITHUB_REPO_URL%
    git remote add origin "%GITHUB_REPO_URL%"
    if %errorlevel% neq 0 (
        echo ERRO ao adicionar o repositorio remoto 'origin'.
        echo Pressione qualquer tecla para sair...
        pause
        exit /b %errorlevel%
    )
) else (
    for /f "tokens=*" %%i in ('git remote get-url origin') do set "current_remote_url=%%i"
    if /i not "%current_remote_url%"=="%GITHUB_REPO_URL%" (
        echo ATENCAO: A URL remota 'origin' existente e diferente da definida no script.
        echo Removendo 'origin' existente e adicionando novamente com a URL do script.
        git remote remove origin
        if %errorlevel% neq 0 (
            echo ERRO ao remover o repositorio remoto existente.
            echo Pressione qualquer tecla para sair...
            pause
            exit /b %errorlevel%
        )
        git remote add origin "%GITHUB_REPO_URL%"
        if %errorlevel% neq 0 (
            echo ERRO ao adicionar 'origin' com a URL correta.
            echo Pressione qualquer tecla para sair...
            pause
            exit /b %errorlevel%
        )
    ) else (
        echo Repositorio remoto 'origin' ja configurado e com a URL correta.
    )
)

echo.
echo =========================================================
echo  INICIANDO O COMANDO GIT PUSH - POR FAVOR, AGUARDE...
echo  (Pode ser que seja solicitada sua autenticação com PAT)
echo =========================================================
echo.

REM Executa o git push e redireciona a saida de erro (stderr) para a saida padrao (stdout)
REM para que todas as mensagens (incluindo erros) sejam exibidas no console.
git push -u origin main 2>&1

if %errorlevel% neq 0 (
    echo.
    echo =========================================================
    echo  ERRO FATAL DURANTE O ENVIO PARA O GITHUB! 🔴
    echo =========================================================
    echo.
    echo O comando 'git push' falhou com codigo de erro: %errorlevel%
    echo Por favor, verifique as mensagens de erro acima para mais detalhes.
    echo A janela nao fechará para que voce possa ver a mensagem de erro.
    echo Pressione qualquer tecla para sair e tentar solucionar o problema...
    pause
    exit /b %errorlevel%
) else (
    echo.
    echo =========================================================
    echo  CONFIRMADO: O COMANDO 'GIT PUSH' FOI EXECUTADO COM SUCESSO! ✅
    echo  Verifique seu repositorio no GitHub para ver os arquivos.
    echo =========================================================
    echo.
)

echo.
echo =========================================================
echo  PROCESSO CONCLUIDO.
echo  Pressione qualquer tecla para fechar esta janela.
echo =========================================================
echo.
pause
exit /b 0