<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>{{ $titre }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; color: #153452; font-size: 12px; }
        .header { border-bottom: 3px solid #d81f32; padding-bottom: 12px; margin-bottom: 16px; }
        .brand { font-size: 28px; font-weight: 700; color: #d81f32; letter-spacing: 1px; }
        .meta { margin-top: 8px; color: #516276; }
        .summary { margin: 16px 0; width: 100%; border-collapse: collapse; }
        .summary td { padding: 8px 10px; background: #f4f7fa; border: 1px solid #d9e3ec; }
        table.report { width: 100%; border-collapse: collapse; }
        .report th, .report td { border: 1px solid #d9e3ec; padding: 7px 8px; vertical-align: top; }
        .report th { background: #153452; color: #fff; font-size: 11px; }
        .report tbody tr:nth-child(even) { background: #f7fafc; }
        .footer { margin-top: 16px; color: #5f7184; font-size: 11px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="brand">NEXANS</div>
        <div><strong>{{ $titre }}</strong></div>
        <div class="meta">
            Genere le {{ $generatedAt->format('Y-m-d H:i') }} |
            Periode {{ $filters['start_date'] }} au {{ $filters['end_date'] }}
        </div>
    </div>

    <table class="summary">
        <tr>
            <td><strong>Nombre de notes</strong><br>{{ $summary['count'] }}</td>
            <td><strong>Montant total</strong><br>{{ number_format($summary['total_amount'], 2, '.', ' ') }} DH</td>
            <td><strong>Montant moyen</strong><br>{{ number_format($summary['average_amount'], 2, '.', ' ') }} DH</td>
            <td><strong>Remboursees</strong><br>{{ $summary['reimbursed_count'] }}</td>
            <td><strong>En attente</strong><br>{{ $summary['pending_count'] }}</td>
        </tr>
    </table>

    <table class="report">
        <thead>
            <tr>
                @foreach ($columns as $column)
                    <th>{{ $column['label'] }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @forelse ($rows as $row)
                <tr>
                    @foreach ($columns as $column)
                        <td>{{ $row[$column['key']] ?? '-' }}</td>
                    @endforeach
                </tr>
            @empty
                <tr>
                    <td colspan="{{ count($columns) }}">Aucune donnee pour cette configuration.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">
        Reference du document: Rapport dynamique notes de frais |
        Lignes exportees: {{ count($rows) }}
    </div>
</body>
</html>
