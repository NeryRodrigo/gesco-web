import pandas as pd

def generar_plantilla_vacia():
    sedes = ['Fontana 1', 'Fontana 2', 'Fontana 3', 'Otros']
    nombre_archivo = 'Plantilla_Reporte_VORDIA.xlsx'
    
    # Creamos el escritor de Excel
    writer = pd.ExcelWriter(nombre_archivo, engine='xlsxwriter')

    for sede in sedes:
        # 1. Resumen superior (puedes dejar los nÃºmeros en 0 o vacÃ­os)
        resumen = {
            'Concepto': ['Alquileres hoy', 'Alquileres este mes'],
            'Cantidad': [0, 0] # Espacio para completar
        }
        
        # 2. Estructura de HuÃ©spedes vacÃ­a (20 filas en blanco)
        columnas_huespedes = [
            'Nombre', 'Apellido', 'DNI/Pasaporte', 
            'TelÃ©fono', 'Email', 'DirecciÃ³n', 'Ciudad', 'Observaciones'
        ]
        # Creamos un DataFrame vacÃ­o con esas columnas
        df_huespedes = pd.DataFrame(columns=columnas_huespedes, index=range(20))

        # Escribir Resumen
        pd.DataFrame(resumen).to_excel(writer, sheet_name=sede, startrow=0, index=False)
        
        # Escribir Tabla de HuÃ©spedes (empezando en la fila 6)
        df_huespedes.to_excel(writer, sheet_name=sede, startrow=5, index=False)
        
        # --- Formato EstÃ©tico con XlsxWriter ---
        workbook  = writer.book
        worksheet = writer.sheets[sede]
        
        # Formato para el tÃ­tulo intermedio
        header_format = workbook.add_format({'bold': True, 'font_color': 'white', 'bg_color': '#2F75B5', 'border': 1})
        worksheet.write(4, 0, "DETALLE DE HUÃ‰SPEDES (LLENAR AQUÃ):", header_format)

        # Ajustar el ancho de las columnas para que sea cÃ³modo escribir
        worksheet.set_column('A:B', 20) # Nombre y Apellido
        worksheet.set_column('C:C', 15) # DNI
        worksheet.set_column('D:E', 25) # TelÃ©fono y Email
        worksheet.set_column('F:H', 30) # DirecciÃ³n, Ciudad y Obs

    writer.close()
    print(f"âœ… Â¡Plantilla '{nombre_archivo}' generada con Ã©xito!")

if __name__ == "__main__":
    generar_plantilla_vacia()
