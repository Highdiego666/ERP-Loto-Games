window.loginModule = () => {
    return `
        <div id="loginRoot" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #0f172a; display: flex; justify-content: center; align-items: center; z-index: 999999;">
            <div style="background: #1e293b; padding: 40px; border-radius: 32px; text-align: center;">
                <h1 style="color: white;">LOTO GAMES POS</h1>
                <p style="color: #94a3b8; font-size: 24px;">Login Test</p>
                <button onclick="alert('Funciona')" style="padding: 10px 20px; background: #6366f1; color: white; border: none; border-radius: 8px; font-size: 18px; cursor: pointer;">Probar</button>
            </div>
        </div>
    `;
};

window.inicializarTecladoPIN = () => {
    console.log("Teclado inicializado (test)");
};

console.log("✅ Login test cargado");
