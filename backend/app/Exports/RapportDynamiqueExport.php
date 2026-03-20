<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Maatwebsite\Excel\Concerns\WithTitle;

class RapportDynamiqueExport implements WithMultipleSheets
{
    public function __construct(
        private readonly Collection $columns,
        private readonly array $rows,
        private readonly array $summary,
        private readonly ?array $charts,
        private readonly array $filters,
    ) {
    }

    public function sheets(): array
    {
        return [
            new RapportArraySheet(
                'Rapport',
                [
                    $this->columns->pluck('label')->all(),
                    ...collect($this->rows)
                        ->map(fn (array $row): array => $this->columns->map(fn (array $column) => $row[$column['key']] ?? '')->all())
                        ->all(),
                ]
            ),
            new RapportArraySheet(
                'Synthese',
                [
                    ['Indicateur', 'Valeur'],
                    ['Nombre de notes', $this->summary['count']],
                    ['Montant total', $this->summary['total_amount']],
                    ['Montant moyen', $this->summary['average_amount']],
                    ['Remboursees', $this->summary['reimbursed_count']],
                    ['En attente', $this->summary['pending_count']],
                    ['Periode debut', $this->filters['start_date'] ?? ''],
                    ['Periode fin', $this->filters['end_date'] ?? ''],
                ]
            ),
            new RapportArraySheet(
                'Graphiques',
                [
                    ['Section', 'Libelle', 'Valeur'],
                    ...collect($this->charts['categories'] ?? [])->map(fn (array $item): array => ['Categories', $item['label'], $item['value']])->all(),
                    ...collect($this->charts['months'] ?? [])->map(fn (array $item): array => ['Mois', $item['label'], $item['value']])->all(),
                ]
            ),
        ];
    }
}

class RapportArraySheet implements FromArray, WithTitle
{
    public function __construct(
        private readonly string $title,
        private readonly array $rows,
    ) {
    }

    public function array(): array
    {
        return $this->rows;
    }

    public function title(): string
    {
        return $this->title;
    }
}
