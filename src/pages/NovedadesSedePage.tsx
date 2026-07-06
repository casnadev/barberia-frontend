import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Gift } from 'lucide-react'
import { sedesService } from '@/services/sedesService'
import { getActiveTenant, getTenantOverride } from '@/services/apiClient'
import { novedadesService } from '@/services/novedadesService'
import { AccountMenu } from '@/components/AccountMenu'
import { FlyerNovedad } from '@/components/FlyerNovedad'
import styles from '@/styles/PublicSedeDetail.module.css'

/**
 * Página pública dedicada: muestra SOLO las novedades (flyers + comentarios)
 * de la sede actual. Se llega desde el botón "Novedades" del landing.
 */
export function NovedadesSedePage() {
  const navigate = useNavigate()
  const [sede, setSede] = useState<any>(null)
  const [novedades, setNovedades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const hostname = window.location.hostname
        const subdominio = getTenantOverride() || ((hostname === 'localhost' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.'))
          ? getActiveTenant()
          : hostname.split('.')[0])

        const sedeData = await sedesService.getSedePublica(subdominio)
        setSede(sedeData)
        if (sedeData?.idSede) {
          const novs = await novedadesService.publicasPorSede(sedeData.idSede)
          setNovedades(novs || [])
        }
      } catch {
        setNovedades([])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const brand = sede?.colorPrimarioHex || '#2855F6'

  return (
    <div className={`${styles.page} ${styles.npPage}`} style={{ ['--brand' as any]: brand }}>
      <header className={styles.npBar}>
        <button className={styles.npBack} onClick={() => navigate(-1)} aria-label="Volver">
          <ChevronLeft width={22} height={22} />
        </button>
        <div className={styles.npBarTitle}>
          <span className={styles.npBarIcon} style={{ background: `${brand}14`, color: brand }}><Gift width={18} height={18} /></span>
          <div>
            <div className={styles.npBarH}>Promociones</div>
            {sede?.nombre && <div className={styles.npBarSub}>{sede.nombre}</div>}
          </div>
        </div>
        <AccountMenu variant="plain" />
      </header>

      <div className={styles.npBody}>
        {loading ? (
          <div className={styles.flyerList}>
            <div className={styles.skelCard} />
            <div className={styles.skelCard} />
          </div>
        ) : novedades.length === 0 ? (
          <div className={styles.npEmpty}>
            <span className={styles.npEmptyIcon} style={{ background: `${brand}14`, color: brand }}><Gift width={32} height={32} /></span>
            <h2 className={styles.npEmptyH}>Aún no hay promociones</h2>
            <p className={styles.npEmptyT}>Cuando {sede?.nombre || 'la barbería'} publique promociones o avisos, aparecerán aquí.</p>
            <button className={styles.npEmptyBtn} style={{ background: brand }} onClick={() => navigate(-1)}>Volver</button>
          </div>
        ) : (
          <div className={styles.flyerList}>
            {novedades.map((n) => (

              <FlyerNovedad key={n.idNovedad} novedad={n} brand={brand} idSede={sede?.idSede} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default NovedadesSedePage
