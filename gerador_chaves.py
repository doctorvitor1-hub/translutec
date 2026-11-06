import hashlib
import time
import tkinter as tk
from tkinter import messagebox

# Segredo criptográfico sincronizado com o seu servidor
SALT_SECRETO = "TRANSLUTEC_SECRET_KEY_2026"
TEMPO_VALIDADE = 300 # 5 minutos (300 segundos)

def calcular_chave():
    janela_tempo = int(time.time() // TEMPO_VALIDADE)
    dado = f"{SALT_SECRETO}_{janela_tempo}"
    chave = hashlib.sha256(dado.encode()).hexdigest()[:8].upper()
    return chave

def copiar_chave():
    chave = label_chave.cget("text")
    if chave and chave != "--------":
        janela.clipboard_clear()
        janela.clipboard_append(chave)
        messagebox.showinfo("Copiado!", f"Chave {chave} copiada para a área de transferência!")

def atualizar_tela():
    chave = calcular_chave()
    label_chave.config(text=chave)
    
    # Tempo restante para a chave expirar
    segundos_restantes = TEMPO_VALIDADE - int(time.time() % TEMPO_VALIDADE)
    minutos = segundos_restantes // 60
    segundos = segundos_restantes % 60
    label_tempo.config(text=f"Expira em: {minutos:02d}:{segundos:02d}")
    
    # Atualiza o relógio a cada 1 segundo
    janela.after(1000, atualizar_tela)

# --- INTERFACE VISUAL (DARK THEME) ---
janela = tk.Tk()
janela.title("Translutec • Authenticator Key")
janela.geometry("380x320")
janela.configure(bg="#090d16")
janela.resizable(False, False)

# Título
titulo = tk.Label(janela, text="TRANSLUTEC AUTH", font=("Helvetica", 16, "bold"), fg="#6366f1", bg="#090d16")
titulo.pack(pady=(20, 5))

subtitulo = tk.Label(janela, text="Gerador de Chave Master Dinâmica", font=("Helvetica", 9), fg="#94a3b8", bg="#090d16")
subtitulo.pack()

# Caixa com a Chave Gerada
frame_chave = tk.Frame(janela, bg="#1e293b", padx=20, pady=15, relief="ridge", bd=1)
frame_chave.pack(pady=20)

label_chave = tk.Label(frame_chave, text="--------", font=("Consolas", 24, "bold"), fg="#38bdf8", bg="#1e293b")
label_chave.pack()

label_tempo = tk.Label(janela, text="Calculando...", font=("Helvetica", 9, "italic"), fg="#f59e0b", bg="#090d16")
label_tempo.pack()

# Botão de Copiar
btn_copiar = tk.Button(janela, text="Copiar Chave para o Admin", font=("Helvetica", 10, "bold"),
                       bg="#6366f1", fg="white", activebackground="#4f46e5", activeforeground="white",
                       relief="flat", padx=15, pady=8, cursor="hand2", command=copiar_chave)
btn_copiar.pack(pady=20)

# Iniciar o loop
atualizar_tela()
janela.mainloop()