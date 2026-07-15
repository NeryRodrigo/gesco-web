$path = "c:\Users\RODY\source\repos\oima-web\app\page.tsx"
$content = [System.IO.File]::ReadAllText($path)

$oldCard = '                  <Card className="border-none shadow-sm rounded-3xl bg-white p-6">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Disponibles</p>
                    <div className="flex items-center justify-between mt-3">
                      <h3 className="text-3xl font-black text-slate-900">3</h3>
                      <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    </div>
                  </Card>'

$newCards = '                  <Card className="border-none shadow-sm rounded-2xl bg-white p-4">
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
                  </Card>'

if ($content.Contains($oldCard)) {
    $content = $content.Replace($oldCard, $newCards)
    [System.IO.File]::WriteAllText($path, $content)
    Write-Host "Success: Card replaced"
} else {
    Write-Host "Error: Old card not found"
}
