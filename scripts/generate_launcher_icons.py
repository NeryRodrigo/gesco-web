"""Compatibilidad: redirige a prepare_isotipo_mobile.py"""
from pathlib import Path
import runpy

runpy.run_path(str(Path(__file__).with_name("prepare_isotipo_mobile.py")), run_name="__main__")
