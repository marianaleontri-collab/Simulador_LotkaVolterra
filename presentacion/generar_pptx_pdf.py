# -*- coding: utf-8 -*-
"""
Script generador de la presentacion profesional en PowerPoint (.pptx) y PDF (.pdf)
para el proyecto EcoFlux (Lotka-Volterra).
Cumple con relacion 16:9, diseno moderno, paleta oficial y graficas de alta resolucion.
"""

import os
import math
from PIL import Image, ImageDraw, ImageFont
import pptx
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# ==============================================================================
# CONFIGURACIÓN DE RUTAS Y CONSTANTES
# ==============================================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, "assets_pptx")
os.makedirs(ASSETS_DIR, exist_ok=True)

PPTX_PATH = os.path.join(BASE_DIR, "EcoFlux_Presentacion.pptx")
PDF_PATH = os.path.join(BASE_DIR, "EcoFlux_Presentacion.pdf")

# Paleta de colores oficial EcoFlux
COLOR_DARK_BG = RGBColor(15, 23, 42)       # #0F172A
COLOR_DARK_CARD = RGBColor(30, 41, 59)     # #1E293B
COLOR_DARK_BORDER = RGBColor(51, 65, 85)   # #334155

COLOR_LIGHT_BG = RGBColor(248, 250, 252)   # #F8FAFC
COLOR_LIGHT_CARD = RGBColor(255, 255, 255) # #FFFFFF
COLOR_LIGHT_BORDER = RGBColor(226, 232, 240) # #E2E8F0

COLOR_PREY = RGBColor(16, 185, 129)        # #10B981
COLOR_PREDATOR = RGBColor(244, 63, 94)     # #F43F5E
COLOR_EQ = RGBColor(245, 158, 11)          # #F59E0B
COLOR_SKY = RGBColor(2, 132, 199)          # #0284C7
COLOR_SKY_LIGHT = RGBColor(56, 189, 248)   # #38BDF8

TEXT_DARK_MAIN = RGBColor(248, 250, 252)
TEXT_DARK_MUTED = RGBColor(148, 163, 184)
TEXT_LIGHT_MAIN = RGBColor(15, 23, 42)
TEXT_LIGHT_MUTED = RGBColor(100, 116, 139)

# ==============================================================================
# 1. GENERACIÓN NUMÉRICA Y GRÁFICAS EN ALTA RESOLUCIÓN (PIL)
# ==============================================================================

def rk4_simulation(alpha=1.1, beta=0.4, delta=0.1, gamma=0.4, x0=10, y0=5, t_max=25, dt=0.04):
    times, preys, preds = [], [], []
    x, y, t = x0, y0, 0.0
    while t <= t_max:
        times.append(t)
        preys.append(x)
        preds.append(y)

        # k1
        dx1 = alpha * x - beta * x * y
        dy1 = delta * x * y - gamma * y

        # k2
        x2 = x + 0.5 * dt * dx1
        y2 = y + 0.5 * dt * dy1
        dx2 = alpha * x2 - beta * x2 * y2
        dy2 = delta * x2 * y2 - gamma * y2

        # k3
        x3 = x + 0.5 * dt * dx2
        y3 = y + 0.5 * dt * dy2
        dx3 = alpha * x3 - beta * x3 * y3
        dy3 = delta * x3 * y3 - gamma * y3

        # k4
        x4 = x + dt * dx3
        y4 = y + dt * dy3
        dx4 = alpha * x4 - beta * x4 * y4
        dy4 = delta * x4 * y4 - gamma * y4

        x += (dt / 6.0) * (dx1 + 2 * dx2 + 2 * dx3 + dx4)
        y += (dt / 6.0) * (dy1 + 2 * dy2 + 2 * dy3 + dy4)
        t += dt
    return times, preys, preds

def euler_simulation(alpha=1.1, beta=0.4, delta=0.1, gamma=0.4, x0=8, y0=4, t_max=22, dt=0.075):
    preys, preds = [], []
    x, y, t = x0, y0, 0.0
    while t <= t_max:
        preys.append(x)
        preds.append(y)
        dx = alpha * x - beta * x * y
        dy = delta * x * y - gamma * y
        x += dt * dx
        y += dt * dy
        t += dt
    return preys, preds

def generate_timeseries_chart(output_path):
    """Genera la gráfica de series de tiempo para la Diapositiva 5."""
    W, H = 1600, 800
    img = Image.new("RGBA", (W, H), (30, 41, 59, 255)) # #1E293B
    draw = ImageDraw.Draw(img)

    times, preys, preds = rk4_simulation(t_max=25, dt=0.03)

    margin_x, margin_y = 120, 80
    plot_w = W - 2 * margin_x
    plot_h = H - 2 * margin_y

    max_t = max(times)
    max_val = max(max(preys), max(preds)) * 1.1

    # Cuadrícula
    for gy in range(5):
        y_pos = margin_y + gy * (plot_h / 4)
        draw.line([(margin_x, y_pos), (W - margin_x, y_pos)], fill=(51, 65, 85, 120), width=2)
    for gx in range(6):
        x_pos = margin_x + gx * (plot_w / 5)
        draw.line([(x_pos, margin_y), (x_pos, H - margin_y)], fill=(51, 65, 85, 120), width=2)

    # Curvas
    points_prey = []
    points_pred = []
    for t, p, q in zip(times, preys, preds):
        px = margin_x + (t / max_t) * plot_w
        py_prey = (H - margin_y) - (p / max_val) * plot_h
        py_pred = (H - margin_y) - (q / max_val) * plot_h
        points_prey.append((px, py_prey))
        points_pred.append((px, py_pred))

    # Dibujar líneas gruesas
    draw.line(points_prey, fill=(16, 185, 129, 255), width=6) # Verde esmeralda
    draw.line(points_pred, fill=(244, 63, 94, 255), width=6)  # Rojo coral

    # Suavizado 2x
    img = img.resize((W // 2, H // 2), Image.Resampling.LANCZOS)
    img.save(output_path, "PNG")

def generate_phase_chart(output_path):
    """Genera el retrato de fase para la Diapositiva 7."""
    W, H = 1400, 800
    img = Image.new("RGBA", (W, H), (30, 41, 59, 255))
    draw = ImageDraw.Draw(img)

    margin_x, margin_y = 100, 70
    plot_w = W - 2 * margin_x
    plot_h = H - 2 * margin_y

    max_x = 18.0
    max_y = 9.0

    # Cuadrícula
    for gy in range(5):
        y_pos = margin_y + gy * (plot_h / 4)
        draw.line([(margin_x, y_pos), (W - margin_x, y_pos)], fill=(51, 65, 85, 100), width=2)
    for gx in range(5):
        x_pos = margin_x + gx * (plot_w / 4)
        draw.line([(x_pos, margin_y), (x_pos, H - margin_y)], fill=(51, 65, 85, 100), width=2)

    # Múltiples órbitas concéntricas
    orbits = [
        (rk4_simulation(x0=8, y0=4, t_max=30, dt=0.02), (16, 185, 129, 255), 5),    # Verde
        (rk4_simulation(x0=12, y0=6, t_max=30, dt=0.02), (56, 189, 248, 200), 3),   # Azul
        (rk4_simulation(x0=6, y0=2, t_max=30, dt=0.02), (244, 63, 94, 180), 3),    # Rojo
    ]

    for (_, px, py), col, stroke_w in orbits:
        pts = []
        for x, y in zip(px, py):
            cx = margin_x + (x / max_x) * plot_w
            cy = (H - margin_y) - (y / max_y) * plot_h
            pts.append((cx, cy))
        draw.line(pts, fill=col, width=stroke_w)

    # Punto de Equilibrio E1 = (4.0, 2.75)
    e1_x = margin_x + (4.0 / max_x) * plot_w
    e1_y = (H - margin_y) - (2.75 / max_y) * plot_h
    r = 14
    # Brillo ámbar
    draw.ellipse([(e1_x - r * 1.8, e1_y - r * 1.8), (e1_x + r * 1.8, e1_y + r * 1.8)], fill=(245, 158, 11, 70))
    draw.ellipse([(e1_x - r, e1_y - r), (e1_x + r, e1_y + r)], fill=(245, 158, 11, 255), outline=(255, 255, 255, 255), width=3)

    img = img.resize((W // 2, H // 2), Image.Resampling.LANCZOS)
    img.save(output_path, "PNG")

def generate_comparison_charts(euler_path, rk4_path):
    """Genera las mini-gráficas de Euler vs RK4 para la Diapositiva 8."""
    # 1. Euler Divergente
    W, H = 800, 500
    img_e = Image.new("RGBA", (W, H), (248, 250, 252, 255))
    draw_e = ImageDraw.Draw(img_e)
    preys_e, preds_e = euler_simulation()
    max_x, max_y = 20.0, 10.0
    margin = 50
    pts_e = []
    for x, y in zip(preys_e, preds_e):
        cx = margin + (x / max_x) * (W - 2 * margin)
        cy = (H - margin) - (y / max_y) * (H - 2 * margin)
        pts_e.append((cx, cy))
    draw_e.line(pts_e, fill=(244, 63, 94, 255), width=4)
    img_e.resize((W // 2, H // 2), Image.Resampling.LANCZOS).save(euler_path, "PNG")

    # 2. RK4 Conservativo
    img_r = Image.new("RGBA", (W, H), (248, 250, 252, 255))
    draw_r = ImageDraw.Draw(img_r)
    _, preys_r, preds_r = rk4_simulation(x0=8, y0=4, t_max=30, dt=0.03)
    pts_r = []
    for x, y in zip(preys_r, preds_r):
        cx = margin + (x / max_x) * (W - 2 * margin)
        cy = (H - margin) - (y / max_y) * (H - 2 * margin)
        pts_r.append((cx, cy))
    draw_r.line(pts_r, fill=(16, 185, 129, 255), width=5)
    img_r.resize((W // 2, H // 2), Image.Resampling.LANCZOS).save(rk4_path, "PNG")

# Generar activos de imagen
chart_ts_path = os.path.join(ASSETS_DIR, "chart_timeseries.png")
chart_phase_path = os.path.join(ASSETS_DIR, "chart_phase.png")
chart_euler_path = os.path.join(ASSETS_DIR, "chart_euler.png")
chart_rk4_path = os.path.join(ASSETS_DIR, "chart_rk4.png")

generate_timeseries_chart(chart_ts_path)
generate_phase_chart(chart_phase_path)
generate_comparison_charts(chart_euler_path, chart_rk4_path)

# ==============================================================================
# 2. CONSTRUCCIÓN DE LA PRESENTACIÓN POWERPOINT (.PPTX) 16:9
# ==============================================================================

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
blank_layout = prs.slide_layouts[6] # Diapositiva en blanco

def apply_background(slide, color):
    bg_shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg_shape.fill.solid()
    bg_shape.fill.fore_color.rgb = color
    bg_shape.line.fill.background()
    return bg_shape

def add_header(slide, tag_text, title_text, dark=False):
    # Tag
    tb_tag = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(11), Inches(0.4))
    p_tag = tb_tag.text_frame.paragraphs[0]
    p_tag.text = tag_text.upper()
    p_tag.font.size = Pt(11)
    p_tag.font.bold = True
    p_tag.font.name = "Space Grotesk"
    p_tag.font.color.rgb = COLOR_SKY_LIGHT if dark else COLOR_SKY

    # Title
    tb_tit = slide.shapes.add_textbox(Inches(0.8), Inches(0.85), Inches(11.5), Inches(0.8))
    p_tit = tb_tit.text_frame.paragraphs[0]
    p_tit.text = title_text
    p_tit.font.size = Pt(32)
    p_tit.font.bold = True
    p_tit.font.name = "Space Grotesk"
    p_tit.font.color.rgb = TEXT_DARK_MAIN if dark else TEXT_LIGHT_MAIN

# ------------------------------------------------------------------------------
# DIAPOSITIVA 1: Portada EcoFlux (Oscuro)
# ------------------------------------------------------------------------------
s1 = prs.slides.add_slide(blank_layout)
apply_background(s1, COLOR_DARK_BG)

# Tag superior
tb_tag = s1.shapes.add_textbox(Inches(1.0), Inches(1.2), Inches(11.3), Inches(0.5))
p = tb_tag.text_frame.paragraphs[0]
p.alignment = PP_ALIGN.CENTER
p.text = "MODELADO MATEMÁTICO DE ECOSISTEMAS"
p.font.size = Pt(13)
p.font.bold = True
p.font.color.rgb = COLOR_PREY

# Gran Titular
tb_title = s1.shapes.add_textbox(Inches(1.0), Inches(2.2), Inches(11.3), Inches(1.5))
p = tb_title.text_frame.paragraphs[0]
p.alignment = PP_ALIGN.CENTER
p.text = "EcoFlux"
p.font.size = Pt(72)
p.font.bold = True
p.font.color.rgb = TEXT_DARK_MAIN

# Subtítulo
tb_sub = s1.shapes.add_textbox(Inches(1.0), Inches(3.6), Inches(11.3), Inches(0.8))
p = tb_sub.text_frame.paragraphs[0]
p.alignment = PP_ALIGN.CENTER
p.text = "Ecuaciones Diferenciales de Lotka-Volterra en acción"
p.font.size = Pt(22)
p.font.color.rgb = TEXT_DARK_MUTED

# Pie con autores
tb_foot = s1.shapes.add_textbox(Inches(0.8), Inches(6.2), Inches(11.7), Inches(0.7))
p = tb_foot.text_frame.paragraphs[0]
p.alignment = PP_ALIGN.CENTER
p.text = "Juan Diego Bautista Murcia • Juan Pablo Beltran Bejarano • Daniel Felipe Cagua Roldan • Mariana Leon Triana"
p.font.size = Pt(13)
p.font.color.rgb = TEXT_DARK_MUTED

p2 = tb_foot.text_frame.add_paragraph()
p2.alignment = PP_ALIGN.CENTER
p2.text = "Ecuaciones Diferenciales • UDEC 2026"
p2.font.size = Pt(12)
p2.font.bold = True
p2.font.color.rgb = COLOR_PREY

# ------------------------------------------------------------------------------
# DIAPOSITIVA 2: ¿Para qué sirve EcoFlux? (Claro)
# ------------------------------------------------------------------------------
s2 = prs.slides.add_slide(blank_layout)
apply_background(s2, COLOR_LIGHT_BG)
add_header(s2, "Utilidad y Aplicación", "¿Para qué sirve EcoFlux?")

cards_s2 = [
    ("Predecir ciclos", "Anticipa auges y caídas poblacionales.", COLOR_PREY),
    ("Detectar extinciones", "Alerta colapsos antes que ocurran.", COLOR_PREDATOR),
    ("Laboratorio virtual", "Experimenta escenarios sin alterar ecosistemas.", COLOR_SKY)
]

for idx, (ctitle, cdesc, ccolor) in enumerate(cards_s2):
    cx = Inches(0.8 + idx * 4.0)
    card = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, cx, Inches(2.2), Inches(3.7), Inches(3.8))
    card.fill.solid()
    card.fill.fore_color.rgb = COLOR_LIGHT_CARD
    card.line.color.rgb = ccolor
    card.line.width = Pt(2.5)

    tb = s2.shapes.add_textbox(cx + Inches(0.3), Inches(2.7), Inches(3.1), Inches(2.8))
    tf = tb.text_frame
    tf.word_wrap = True
    p1 = tf.paragraphs[0]
    p1.text = ctitle
    p1.font.size = Pt(22)
    p1.font.bold = True
    p1.font.color.rgb = ccolor

    p2 = tf.add_paragraph()
    p2.text = "\n" + cdesc
    p2.font.size = Pt(17)
    p2.font.color.rgb = TEXT_LIGHT_MUTED

# ------------------------------------------------------------------------------
# DIAPOSITIVA 3: Dos EDOs No Lineales Acopladas (Claro)
# ------------------------------------------------------------------------------
s3 = prs.slides.add_slide(blank_layout)
apply_background(s3, COLOR_LIGHT_BG)
add_header(s3, "Fundamento Teórico", "Dos EDOs No Lineales Acopladas")

# Tarjeta Presas
c_prey = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(2.0), Inches(6.8), Inches(1.8))
c_prey.fill.solid()
c_prey.fill.fore_color.rgb = COLOR_LIGHT_CARD
c_prey.line.color.rgb = COLOR_PREY
c_prey.line.width = Pt(3)

tb = s3.shapes.add_textbox(Inches(1.1), Inches(2.15), Inches(6.2), Inches(1.5))
p1 = tb.text_frame.paragraphs[0]
p1.text = "PRESAS (x)"
p1.font.size = Pt(12)
p1.font.bold = True
p1.font.color.rgb = COLOR_PREY
p2 = tb.text_frame.add_paragraph()
p2.text = "dx/dt = αx - βxy"
p2.font.size = Pt(28)
p2.font.bold = True
p2.font.name = "JetBrains Mono"
p2.font.color.rgb = TEXT_LIGHT_MAIN

# Tarjeta Depredadores
c_pred = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(4.1), Inches(6.8), Inches(1.8))
c_pred.fill.solid()
c_pred.fill.fore_color.rgb = COLOR_LIGHT_CARD
c_pred.line.color.rgb = COLOR_PREDATOR
c_pred.line.width = Pt(3)

tb2 = s3.shapes.add_textbox(Inches(1.1), Inches(4.25), Inches(6.2), Inches(1.5))
p1 = tb2.text_frame.paragraphs[0]
p1.text = "DEPREDADORES (y)"
p1.font.size = Pt(12)
p1.font.bold = True
p1.font.color.rgb = COLOR_PREDATOR
p2 = tb2.text_frame.add_paragraph()
p2.text = "dy/dt = δxy - γy"
p2.font.size = Pt(28)
p2.font.bold = True
p2.font.name = "JetBrains Mono"
p2.font.color.rgb = TEXT_LIGHT_MAIN

# Etiquetas cortas abajo
tb_pills = s3.shapes.add_textbox(Inches(0.8), Inches(6.2), Inches(6.8), Inches(0.6))
p = tb_pills.text_frame.paragraphs[0]
p.text = "• 1.er Orden   • Autónomas   • No Lineales (término xy)"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = COLOR_SKY

# Lado derecho: Diagrama conceptual
c_diag = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(8.0), Inches(2.0), Inches(4.5), Inches(3.9))
c_diag.fill.solid()
c_diag.fill.fore_color.rgb = COLOR_LIGHT_CARD
c_diag.line.color.rgb = COLOR_LIGHT_BORDER

tb_diag = s3.shapes.add_textbox(Inches(8.3), Inches(2.3), Inches(3.9), Inches(3.3))
tf = tb_diag.text_frame
tf.word_wrap = True
p = tf.paragraphs[0]
p.text = "INTERACCIÓN BIOLÓGICA"
p.font.size = Pt(13)
p.font.bold = True
p.font.color.rgb = TEXT_LIGHT_MUTED
p2 = tf.add_paragraph()
p2.text = "\nPresa x(t): Crece naturalmente por natalidad (αx) y decrece por encuentros de caza (βxy).\n\nDepredador y(t): Se reproduce al cazar (δxy) y decae naturalmente por mortalidad (γy)."
p2.font.size = Pt(14)
p2.font.color.rgb = TEXT_LIGHT_MAIN

# ------------------------------------------------------------------------------
# DIAPOSITIVA 4: Significado de los 4 Parámetros (Claro)
# ------------------------------------------------------------------------------
s4 = prs.slides.add_slide(blank_layout)
apply_background(s4, COLOR_LIGHT_BG)
add_header(s4, "Variables del Modelo", "Significado de los 4 Parámetros")

params = [
    ("α", "Natalidad natural de presas.", COLOR_PREY, Inches(1.5), Inches(2.0)),
    ("β", "Tasa de caza o depredación.", COLOR_PREDATOR, Inches(7.0), Inches(2.0)),
    ("δ", "Eficiencia reproductiva del depredador.", COLOR_SKY, Inches(1.5), Inches(4.3)),
    ("γ", "Mortalidad natural del depredador.", COLOR_EQ, Inches(7.0), Inches(4.3))
]

for sym, desc, col, px, py in params:
    card = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, px, py, Inches(4.8), Inches(1.9))
    card.fill.solid()
    card.fill.fore_color.rgb = COLOR_LIGHT_CARD
    card.line.color.rgb = col
    card.line.width = Pt(3)

    tb = s4.shapes.add_textbox(px + Inches(0.4), py + Inches(0.3), Inches(4.0), Inches(1.4))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = sym
    p.font.size = Pt(36)
    p.font.bold = True
    p.font.name = "JetBrains Mono"
    p.font.color.rgb = col

    p2 = tf.add_paragraph()
    p2.text = desc
    p2.font.size = Pt(16)
    p2.font.bold = True
    p2.font.color.rgb = TEXT_LIGHT_MAIN

# ------------------------------------------------------------------------------
# DIAPOSITIVA 5: Dinámica en el Tiempo (Oscuro)
# ------------------------------------------------------------------------------
s5 = prs.slides.add_slide(blank_layout)
apply_background(s5, COLOR_DARK_BG)
add_header(s5, "Evolución Temporal", "Oscilaciones Acopladas", dark=True)

# Imagen de alta resolución de la gráfica
s5.shapes.add_picture(chart_ts_path, Inches(0.8), Inches(1.8), Inches(11.7), Inches(4.5))

# Anotación al pie
tb_foot5 = s5.shapes.add_textbox(Inches(0.8), Inches(6.5), Inches(11.7), Inches(0.5))
p = tb_foot5.text_frame.paragraphs[0]
p.alignment = PP_ALIGN.CENTER
p.text = "1. Crecen presas   →   2. Auge depredador   →   3. Caída y rebote"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = COLOR_SKY_LIGHT

# ------------------------------------------------------------------------------
# DIAPOSITIVA 6: Puntos de Equilibrio y Estabilidad (Claro)
# ------------------------------------------------------------------------------
s6 = prs.slides.add_slide(blank_layout)
apply_background(s6, COLOR_LIGHT_BG)
add_header(s6, "Análisis Cualitativo", "Puntos de Equilibrio y Estabilidad")

# Columna E0
c_e0 = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.2), Inches(2.0), Inches(5.0), Inches(3.6))
c_e0.fill.solid()
c_e0.fill.fore_color.rgb = COLOR_LIGHT_CARD
c_e0.line.color.rgb = COLOR_PREDATOR
c_e0.line.width = Pt(3)

tb = s6.shapes.add_textbox(Inches(1.5), Inches(2.4), Inches(4.4), Inches(2.8))
tf = tb.text_frame
tf.word_wrap = True
p = tf.paragraphs[0]
p.alignment = PP_ALIGN.CENTER
p.text = "E₀ = (0, 0)"
p.font.size = Pt(32)
p.font.bold = True
p.font.name = "JetBrains Mono"
p.font.color.rgb = TEXT_LIGHT_MAIN

p2 = tf.add_paragraph()
p2.alignment = PP_ALIGN.CENTER
p2.text = "\nExtinción Total"
p2.font.size = Pt(22)
p2.font.bold = True
p2.font.color.rgb = COLOR_PREDATOR

p3 = tf.add_paragraph()
p3.alignment = PP_ALIGN.CENTER
p3.text = "Punto silla (inestable)"
p3.font.size = Pt(16)
p3.font.color.rgb = TEXT_LIGHT_MUTED

# Columna E1
c_e1 = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(7.1), Inches(2.0), Inches(5.0), Inches(3.6))
c_e1.fill.solid()
c_e1.fill.fore_color.rgb = COLOR_LIGHT_CARD
c_e1.line.color.rgb = COLOR_EQ
c_e1.line.width = Pt(3)

tb = s6.shapes.add_textbox(Inches(7.4), Inches(2.4), Inches(4.4), Inches(2.8))
tf = tb.text_frame
tf.word_wrap = True
p = tf.paragraphs[0]
p.alignment = PP_ALIGN.CENTER
p.text = "E₁ = (γ/δ, α/β)"
p.font.size = Pt(32)
p.font.bold = True
p.font.name = "JetBrains Mono"
p.font.color.rgb = TEXT_LIGHT_MAIN

p2 = tf.add_paragraph()
p2.alignment = PP_ALIGN.CENTER
p2.text = "\nCoexistencia"
p2.font.size = Pt(22)
p2.font.bold = True
p2.font.color.rgb = COLOR_EQ

p3 = tf.add_paragraph()
p3.alignment = PP_ALIGN.CENTER
p3.text = "Centro (estabilidad neutra)"
p3.font.size = Pt(16)
p3.font.color.rgb = TEXT_LIGHT_MUTED

# Banner inferior
banner = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.2), Inches(6.0), Inches(10.9), Inches(0.8))
banner.fill.solid()
banner.fill.fore_color.rgb = RGBColor(240, 249, 255)
banner.line.color.rgb = COLOR_SKY
tb = s6.shapes.add_textbox(Inches(1.3), Inches(6.15), Inches(10.7), Inches(0.5))
p = tb.text_frame.paragraphs[0]
p.alignment = PP_ALIGN.CENTER
p.text = "Cuando dx/dt = 0 y dy/dt = 0, las poblaciones se mantienen constantes."
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = COLOR_SKY

# ------------------------------------------------------------------------------
# DIAPOSITIVA 7: El Retrato de Fase (Oscuro)
# ------------------------------------------------------------------------------
s7 = prs.slides.add_slide(blank_layout)
apply_background(s7, COLOR_DARK_BG)
add_header(s7, "Espacio de Estados", "El Retrato de Fase", dark=True)

# Gráfica a la izquierda (65%)
s7.shapes.add_picture(chart_phase_path, Inches(0.8), Inches(1.8), Inches(7.8), Inches(5.0))

# Lado derecho (35%)
card_eq = s7.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(8.9), Inches(1.8), Inches(3.6), Inches(2.3))
card_eq.fill.solid()
card_eq.fill.fore_color.rgb = COLOR_DARK_CARD
card_eq.line.color.rgb = COLOR_DARK_BORDER

tb = s7.shapes.add_textbox(Inches(9.1), Inches(2.0), Inches(3.2), Inches(1.9))
tf = tb.text_frame
tf.word_wrap = True
p = tf.paragraphs[0]
p.text = "RELACIÓN DIRECTA"
p.font.size = Pt(11)
p.font.bold = True
p.font.color.rgb = COLOR_SKY_LIGHT
p2 = tf.add_paragraph()
p2.text = "\ndy/dx = y(δx - γ) / [x(α - βy)]"
p2.font.size = Pt(15)
p2.font.bold = True
p2.font.name = "JetBrains Mono"
p2.font.color.rgb = TEXT_DARK_MAIN

tb_bullets = s7.shapes.add_textbox(Inches(8.9), Inches(4.5), Inches(3.6), Inches(2.2))
tf = tb_bullets.text_frame
tf.word_wrap = True
p = tf.paragraphs[0]
p.text = "• Sin variable tiempo t."
p.font.size = Pt(16)
p.font.bold = True
p.font.color.rgb = TEXT_DARK_MAIN
p2 = tf.add_paragraph()
p2.text = "\n• Trayectoria cerrada = ciclo perpetuo."
p2.font.size = Pt(16)
p2.font.bold = True
p2.font.color.rgb = COLOR_PREY

# ------------------------------------------------------------------------------
# DIAPOSITIVA 8: RK4 vs Euler (Claro)
# ------------------------------------------------------------------------------
s8 = prs.slides.add_slide(blank_layout)
apply_background(s8, COLOR_LIGHT_BG)
add_header(s8, "Integración Numérica", "¿Por qué Runge-Kutta (RK4)?")

# Euler
c_e = s8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.0), Inches(1.8), Inches(5.3), Inches(4.8))
c_e.fill.solid()
c_e.fill.fore_color.rgb = COLOR_LIGHT_CARD
c_e.line.color.rgb = COLOR_PREDATOR
c_e.line.width = Pt(2.5)

tb = s8.shapes.add_textbox(Inches(1.2), Inches(2.0), Inches(4.9), Inches(0.9))
p = tb.text_frame.paragraphs[0]
p.text = "Método de Euler — Error O(h)"
p.font.size = Pt(18)
p.font.bold = True
p.font.color.rgb = COLOR_PREDATOR

s8.shapes.add_picture(chart_euler_path, Inches(1.4), Inches(2.9), Inches(4.5), Inches(2.6))

tb_e_sub = s8.shapes.add_textbox(Inches(1.2), Inches(5.8), Inches(4.9), Inches(0.6))
p = tb_e_sub.text_frame.paragraphs[0]
p.alignment = PP_ALIGN.CENTER
p.text = "Espiral divergente (inestable)"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = COLOR_PREDATOR

# RK4
c_r = s8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(7.0), Inches(1.8), Inches(5.3), Inches(4.8))
c_r.fill.solid()
c_r.fill.fore_color.rgb = COLOR_LIGHT_CARD
c_r.line.color.rgb = COLOR_PREY
c_r.line.width = Pt(2.5)

tb = s8.shapes.add_textbox(Inches(7.2), Inches(2.0), Inches(4.9), Inches(0.9))
p = tb.text_frame.paragraphs[0]
p.text = "Runge-Kutta (RK4) — Error O(h⁴)"
p.font.size = Pt(18)
p.font.bold = True
p.font.color.rgb = COLOR_PREY

s8.shapes.add_picture(chart_rk4_path, Inches(7.4), Inches(2.9), Inches(4.5), Inches(2.6))

tb_r_sub = s8.shapes.add_textbox(Inches(7.2), Inches(5.8), Inches(4.9), Inches(0.6))
p = tb_r_sub.text_frame.paragraphs[0]
p.alignment = PP_ALIGN.CENTER
p.text = "Órbita periódica cerrada (conservativa)"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = COLOR_PREY

# ------------------------------------------------------------------------------
# DIAPOSITIVA 9: ¿Cómo Funciona EcoFlux? (Claro)
# ------------------------------------------------------------------------------
s9 = prs.slides.add_slide(blank_layout)
apply_background(s9, COLOR_LIGHT_BG)
add_header(s9, "Arquitectura del Simulador", "¿Cómo Funciona EcoFlux?")

steps = [
    ("1. Configura", "Ajusta especies, tasas y Δt.", COLOR_SKY),
    ("2. Resuelve", "El motor RK4 integra las EDOs.", COLOR_PREY),
    ("3. Analiza", "Explora curvas y retrato de fase.", COLOR_EQ)
]

for idx, (stitle, sdesc, scolor) in enumerate(steps):
    cx = Inches(0.8 + idx * 4.0)
    card = s9.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, cx, Inches(2.2), Inches(3.7), Inches(2.6))
    card.fill.solid()
    card.fill.fore_color.rgb = COLOR_LIGHT_CARD
    card.line.color.rgb = scolor
    card.line.width = Pt(3)

    tb = s9.shapes.add_textbox(cx + Inches(0.3), Inches(2.5), Inches(3.1), Inches(2.0))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = stitle
    p.font.size = Pt(22)
    p.font.bold = True
    p.font.color.rgb = scolor

    p2 = tf.add_paragraph()
    p2.text = "\n" + sdesc
    p2.font.size = Pt(16)
    p2.font.color.rgb = TEXT_LIGHT_MAIN

# Banner Mockup
banner9 = s9.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.5), Inches(5.3), Inches(10.3), Inches(1.2))
banner9.fill.solid()
banner9.fill.fore_color.rgb = COLOR_DARK_BG
banner9.line.color.rgb = COLOR_DARK_BORDER

tb = s9.shapes.add_textbox(Inches(1.8), Inches(5.6), Inches(9.7), Inches(0.7))
p = tb.text_frame.paragraphs[0]
p.alignment = PP_ALIGN.CENTER
p.text = "ecoflux-simulador.app   •   Motor RK4 a 60 FPS   •   Invariante Conservativa"
p.font.size = Pt(15)
p.font.bold = True
p.font.name = "JetBrains Mono"
p.font.color.rgb = COLOR_PREY

# ------------------------------------------------------------------------------
# DIAPOSITIVA 10: Escenarios Reales y Demo en Vivo (Oscuro)
# ------------------------------------------------------------------------------
s10 = prs.slides.add_slide(blank_layout)
apply_background(s10, COLOR_DARK_BG)
add_header(s10, "Casos de Estudio", "Escenarios Reales", dark=True)

cases = [
    ("Lince y Liebre", "Ciclo clásico", COLOR_PREY),
    ("Equilibrio Armónico", "Oscilación estable", COLOR_SKY_LIGHT),
    ("Borde de Extinción", "Sobredepredación", COLOR_PREDATOR)
]

for idx, (ctitle, cdesc, ccolor) in enumerate(cases):
    cx = Inches(1.2 + idx * 3.8)
    card = s10.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, cx, Inches(1.9), Inches(3.4), Inches(1.7))
    card.fill.solid()
    card.fill.fore_color.rgb = COLOR_DARK_CARD
    card.line.color.rgb = ccolor
    card.line.width = Pt(2)

    tb = s10.shapes.add_textbox(cx + Inches(0.2), Inches(2.1), Inches(3.0), Inches(1.3))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    p.text = ctitle
    p.font.size = Pt(18)
    p.font.bold = True
    p.font.color.rgb = TEXT_DARK_MAIN

    p2 = tf.add_paragraph()
    p2.alignment = PP_ALIGN.CENTER
    p2.text = cdesc
    p2.font.size = Pt(13)
    p2.font.color.rgb = ccolor

# Banner central para la demo
banner_demo = s10.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.8), Inches(4.1), Inches(9.7), Inches(2.3))
banner_demo.fill.solid()
banner_demo.fill.fore_color.rgb = COLOR_DARK_CARD
banner_demo.line.color.rgb = COLOR_PREY
banner_demo.line.width = Pt(3)

tb = s10.shapes.add_textbox(Inches(2.0), Inches(4.4), Inches(9.3), Inches(1.7))
tf = tb.text_frame
tf.word_wrap = True
p = tf.paragraphs[0]
p.alignment = PP_ALIGN.CENTER
p.text = "Demostración en Vivo"
p.font.size = Pt(38)
p.font.bold = True
p.font.color.rgb = COLOR_PREY

p2 = tf.add_paragraph()
p2.alignment = PP_ALIGN.CENTER
p2.text = "\nEcoFlux — De las ecuaciones a la simulación interactiva."
p2.font.size = Pt(18)
p2.font.color.rgb = TEXT_DARK_MAIN

# Guardar la presentación en PowerPoint
prs.save(PPTX_PATH)
print(f"PPTX generado con éxito en: {PPTX_PATH}")
