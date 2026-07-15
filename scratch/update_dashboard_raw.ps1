$path = "c:\Users\RODY\source\repos\oima-web\app\page.tsx"
$content = [System.IO.File]::ReadAllText($path)

$oldStart = '          {vistaActual === "inicio" && ('
$oldEnd = '                </div>'

# Buscamos el inicio y el final del bloque de tarjetas
$startIndex = $content.IndexOf($oldStart)
if ($startIndex -ge 0) {
    $endIndex = $content.IndexOf($oldEnd, $startIndex)
    if ($endIndex -ge 0) {
        $endIndex += $oldEnd.Length
        
        $newContent = '          {vistaActual === "inicio" && (
            <div className="space-y-8 animate-in fade-in duration-700">
                {/* Dashboard Principal (7 Tarjetas Dinámicas Reales) */}
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4 animate-in slide-in-from-bottom-4 duration-700">
                  <Card className="border-none shadow-sm rounded-2xl bg-white p-4">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Dúplex Ocupados</p>
                    <div className="flex items-center justify-between mt-2">
                      <h3 className="text-2xl font-black text-slate-900">{condoDashboardData?.summary.totalOcupados || 0}</h3>
                      <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                        <Home className="w-4 h-4" />
                      </div>
                    </div>
                  </Card>

                  <Card className="border-none shadow-sm rounded-2xl bg-white p-4">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Disponibles</p>
                    <div className="flex items-center justify-between mt-2">
                      <h3 className="text-2xl font-black text-slate-900">{condoDashboardData?.summary.totalDisponibles || 0}</h3>
                      <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>
                  </Card>

                  <Card className="border-none shadow-sm rounded-2xl bg-white p-4 border-l-4 border-primary/20">
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest">Objetivos Mes</p>
                    <div className="flex items-center justify-between mt-2">
                      <h3 className="text-lg font-black text-primary">{formatCurrency(condoDashboardData?.summary.objetivoMensual || 0)}</h3>
                      <div className="bg-primary/10 p-2 rounded-lg text-primary">
                        <Sparkles className="w-4 h-4" />
                      </div>
                    </div>
                  </Card>

                  <Card className="border-none shadow-sm rounded-2xl bg-white p-4">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cobrado Mes</p>
                    <div className="flex items-center justify-between mt-2">
                      <h3 className="text-lg font-black text-emerald-600">{formatCurrency(condoDashboardData?.summary.totalCobradoMes || 0)}</h3>
                      <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
                        <Wallet className="w-4 h-4" />
                      </div>
                    </div>
                  </Card>

                  <Card className="border-none shadow-sm rounded-2xl bg-white p-4">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Falta Cobrar</p>
                    <div className="flex items-center justify-between mt-2">
                      <h3 className="text-lg font-black text-red-600">{formatCurrency(condoDashboardData?.summary.totalPendiente || 0)}</h3>
                      <div className="bg-red-50 p-2 rounded-xl text-red-500">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    </div>
                  </Card>

                  <Card className="border-none shadow-sm rounded-2xl bg-white p-4">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Vencimientos</p>
                    <div className="flex items-center justify-between mt-2">
                      <h3 className="text-2xl font-black text-orange-500">{condoDashboardData?.summary.proximosVencimientos || 0}</h3>
                      <div className="bg-orange-50 p-2 rounded-xl text-orange-500">
                        <CalendarIcon className="w-4 h-4" />
                      </div>
                    </div>
                  </Card>

                  <Card className="border-none shadow-sm rounded-2xl bg-white p-4">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Morosos</p>
                    <div className="flex items-center justify-between mt-2">
                      <h3 className="text-2xl font-black text-red-700">{condoDashboardData?.summary.totalMorosos || 0}</h3>
                      <div className="bg-red-100 p-2 rounded-xl text-red-700">
                        <Users className="w-4 h-4" />
                      </div>
                    </div>
                  </Card>
                </div>'
        
        $before = $content.Substring(0, $startIndex)
        $after = $content.Substring($endIndex)
        
        $finalContent = $before + $newContent + $after
        [System.IO.File]::WriteAllText($path, $finalContent)
        Write-Host "Success: Dashboard updated via raw replace"
    }
}
