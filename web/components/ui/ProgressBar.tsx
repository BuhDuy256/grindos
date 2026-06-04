import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  /** 0–100 percentage */
  value: number;
  /** Optional label rendered on the filled portion */
  label?: string;
  /** Use mint accent for reward states */
  variant?: 'default' | 'mint';
}

/**
 * ProgressBar — A pencil-line progress indicator.
 *
 * The filled portion uses diagonal hatching or a solid mint
 * stroke depending on the `variant` prop.
 */
export default function ProgressBar({
  value,
  label,
  variant = 'default',
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={styles.track}>
      <div
        className={`${styles.fill} ${styles[variant]}`}
        style={{ width: `${clampedValue}%` }}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {label && <span className={styles.label}>{label}</span>}
      </div>
    </div>
  );
}
