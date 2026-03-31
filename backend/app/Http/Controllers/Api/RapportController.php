<?php

namespace App\Http\Controllers\Api;

use App\Exports\RapportDynamiqueExport;
use App\Http\Controllers\Controller;
use App\Models\CategorieDepense;
use App\Models\HistoriqueApprobation;
use App\Models\NoteDeFrais;
use App\Models\RapportConfiguration;
use App\Models\User;
use App\Services\NativeXlsxExportService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RapportController extends Controller
{
    public function statistiquesMensuelles(Request $request): JsonResponse
    {
        $year = (int) $request->get('annee', now()->year);

        $query = NoteDeFrais::query();

        if ($request->user()->role === 'Manager') {
            $query->where('email_responsable', $request->user()->email);
        }

        $data = $query
            ->selectRaw('MONTH(date_creation) as mois, COUNT(*) as nb_notes, SUM(total_note) as montant_total')
            ->whereYear('date_creation', $year)
            ->groupByRaw('MONTH(date_creation)')
            ->orderByRaw('MONTH(date_creation)')
            ->get();

        return response()->json($data);
    }

    public function parEmploye(): JsonResponse
    {
        $query = NoteDeFrais::query();

        if (request()->user()->role === 'Manager') {
            $query->where('email_responsable', request()->user()->email);
        }

        $data = $query
            ->selectRaw('email_employe, COUNT(*) as nb_notes, SUM(total_note) as montant_total')
            ->groupBy('email_employe')
            ->with('employe:id,email,nom,departement')
            ->get();

        return response()->json($data);
    }

    public function parDepartement(): JsonResponse
    {
        $data = User::query()
            ->from('users as u')
            ->leftJoin('notes_de_frais as n', 'n.email_employe', '=', 'u.email')
            ->when(request()->user()->role === 'Manager', fn ($q) => $q->where('n.email_responsable', request()->user()->email))
            ->whereNotNull('u.departement')
            ->selectRaw('u.departement as departement, COUNT(DISTINCT u.email) as nb_utilisateurs, COALESCE(SUM(n.total_note), 0) as montant_total')
            ->groupBy('u.departement')
            ->get()
            ->map(function (object $row): array {
                return [
                    'departement' => $row->departement,
                    'nb_utilisateurs' => (int) $row->nb_utilisateurs,
                    'montant_total' => (float) $row->montant_total,
                ];
            });

        return response()->json($data);
    }

    public function equipe(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'Manager', 403);

        $notes = NoteDeFrais::query()->where('email_responsable', $request->user()->email);

        $summary = [
            'total_depenses' => (float) $notes->sum('total_note'),
            'notes_traitees' => (clone $notes)->whereIn('statut', ['en_attente_rh', 'valide_manager', 'valide_paiement', 'refuse', 'a_corriger', 'rembourse'])->count(),
            'moyenne_par_note' => round((float) ((clone $notes)->avg('total_note') ?? 0), 2),
        ];

        $approvalRates = NoteDeFrais::query()
            ->where('email_responsable', $request->user()->email)
            ->selectRaw("email_employe, COUNT(*) as nb_notes, SUM(CASE WHEN statut IN ('en_attente_rh', 'valide_manager', 'valide_paiement', 'rembourse') THEN 1 ELSE 0 END) as nb_approuvees")
            ->groupBy('email_employe')
            ->with('employe:id,email,nom')
            ->get()
            ->map(function ($row): array {
                $total = max((int) $row->nb_notes, 1);

                return [
                    'email_employe' => $row->email_employe,
                    'nom' => $row->employe?->nom,
                    'taux_approbation' => round(((int) $row->nb_approuvees / $total) * 100, 1),
                ];
            });

        return response()->json([
            'summary' => $summary,
            'repartition_employes' => $this->parEmploye()->getData(true),
            'taux_approbation' => $approvalRates,
            'delai_moyen_traitement_jours' => round(
                (float) NoteDeFrais::query()
                    ->where('email_responsable', $request->user()->email)
                    ->whereNotNull('date_soumission')
                    ->whereNotNull('date_validation_manager')
                    ->selectRaw('AVG(TIMESTAMPDIFF(DAY, date_soumission, date_validation_manager)) as delai')
                    ->value('delai'),
                1
            ),
        ]);
    }

    public function globaux(): JsonResponse
    {
        $notes = NoteDeFrais::query();

        return response()->json([
            'total_mois' => (float) (clone $notes)->whereBetween('date_creation', [now()->startOfMonth()->toDateString(), now()->endOfMonth()->toDateString()])->sum('total_note'),
            'total_annee' => (float) (clone $notes)->whereYear('date_creation', now()->year)->sum('total_note'),
            'top_employes' => NoteDeFrais::query()
                ->selectRaw('email_employe, SUM(total_note) as montant_total')
                ->groupBy('email_employe')
                ->with('employe:id,email,nom')
                ->orderByDesc('montant_total')
                ->limit(5)
                ->get(),
            'repartition_categories' => CategorieDepense::query()
                ->leftJoin('lignes_depense as l', 'l.categorie_id', '=', 'categories_depense.id')
                ->selectRaw('categories_depense.nom as categorie, COALESCE(SUM(l.montant), 0) as montant_total')
                ->groupBy('categories_depense.nom')
                ->orderByDesc('montant_total')
                ->get(),
        ]);
    }

    public function exportCsv(): StreamedResponse
    {
        $format = request()->string('format')->value() ?: 'csv';
        $separator = $format === 'xls' ? "\t" : ',';
        $extension = $format === 'xls' ? 'xls' : 'csv';
        $mimeType = $format === 'xls'
            ? 'application/vnd.ms-excel; charset=UTF-8'
            : 'text/csv; charset=UTF-8';
        $filename = 'rapport-notes-de-frais-'.now()->format('Ymd-His').'.'.$extension;

        $headers = [
            'Content-Type' => $mimeType,
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ];

        return response()->streamDownload(function () use ($separator): void {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['ID', 'Mission', 'Employe', 'Responsable', 'Statut', 'Total', 'Date creation'], $separator);

            NoteDeFrais::query()->with(['employe', 'responsable'])->chunk(200, function ($notes) use ($handle, $separator): void {
                foreach ($notes as $note) {
                    fputcsv($handle, [
                        $note->id,
                        $note->titre_mission,
                        $note->employe?->nom,
                        $note->responsable?->nom,
                        $note->statut,
                        $note->total_note,
                        $note->date_creation?->format('Y-m-d'),
                    ], $separator);
                }
            });

            fclose($handle);
        }, $filename, $headers);
    }

    public function colonnesDisponibles(Request $request): JsonResponse
    {
        $this->authorizeBuilder($request);

        return response()->json([
            'groupes' => [
                [
                    'label' => 'Employe',
                    'colonnes' => collect($this->columnDefinitions())->only([
                        'employee_name',
                        'employee_email',
                        'employee_matricule',
                        'employee_department',
                    ])->values(),
                ],
                [
                    'label' => 'Mission',
                    'colonnes' => collect($this->columnDefinitions())->only([
                        'mission_title',
                        'mission_created_at',
                    ])->values(),
                ],
                [
                    'label' => 'Montants',
                    'colonnes' => collect($this->columnDefinitions())->only([
                        'amount_total',
                        'amount_details',
                    ])->values(),
                ],
                [
                    'label' => 'Statuts',
                    'colonnes' => collect($this->columnDefinitions())->only([
                        'status_current',
                        'status_history',
                    ])->values(),
                ],
                [
                    'label' => 'Dates',
                    'colonnes' => collect($this->columnDefinitions())->only([
                        'submitted_at',
                        'manager_validated_at',
                        'rh_validated_at',
                        'reimbursed_at',
                    ])->values(),
                ],
                [
                    'label' => 'Manager',
                    'colonnes' => collect($this->columnDefinitions())->only([
                        'manager_name',
                        'manager_email',
                    ])->values(),
                ],
                [
                    'label' => 'Finance',
                    'colonnes' => collect($this->columnDefinitions())->only([
                        'accounting_reference',
                    ])->values(),
                ],
            ],
            'default' => $this->defaultColumns(),
        ]);
    }

    public function filtresDisponibles(Request $request): JsonResponse
    {
        $this->authorizeBuilder($request);

        return response()->json([
            'statuts' => [
                ['value' => 'brouillon', 'label' => 'Brouillon'],
                ['value' => 'en_attente_responsable', 'label' => 'En attente manager'],
                ['value' => 'en_attente_rh', 'label' => 'En attente RH'],
                ['value' => 'valide_paiement', 'label' => 'Valide paiement'],
                ['value' => 'refuse', 'label' => 'Refuse'],
                ['value' => 'rembourse', 'label' => 'Rembourse'],
                ['value' => 'a_corriger', 'label' => 'A corriger'],
            ],
            'departements' => User::query()
                ->whereNotNull('departement')
                ->distinct()
                ->orderBy('departement')
                ->pluck('departement')
                ->map(fn (string $departement): array => ['value' => $departement, 'label' => $departement])
                ->values(),
            'managers' => User::query()
                ->where('role', 'Manager')
                ->orderBy('nom')
                ->get(['email', 'nom'])
                ->map(fn (User $user): array => [
                    'value' => $user->email,
                    'label' => $user->nom.' ('.$user->email.')',
                ]),
            'employes' => User::query()
                ->where('role', 'Employe')
                ->orderBy('nom')
                ->get(['email', 'nom', 'matricule'])
                ->map(fn (User $user): array => [
                    'value' => $user->email,
                    'label' => $user->nom.' - '.$user->matricule,
                ]),
            'sorts' => collect($this->columnDefinitions())
                ->filter(fn (array $column): bool => $column['sortable'])
                ->values()
                ->map(fn (array $column): array => [
                    'value' => $column['key'],
                    'label' => $column['label'],
                ]),
            'formats' => [
                ['value' => 'pdf', 'label' => 'PDF'],
                ['value' => 'xlsx', 'label' => 'Excel'],
                ['value' => 'csv', 'label' => 'CSV'],
            ],
        ]);
    }

    public function configurations(Request $request): JsonResponse
    {
        $this->authorizeBuilder($request);

        $configs = RapportConfiguration::query()
            ->with('creator:id,nom,email')
            ->orderByDesc('updated_at')
            ->get();

        return response()->json($configs);
    }

    public function sauvegarderConfiguration(Request $request): JsonResponse
    {
        $this->authorizeBuilder($request);

        $validated = Validator::make($request->all(), [
            'id' => ['nullable', 'integer', 'exists:rapport_configurations,id'],
            'nom' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:255'],
            'configuration' => ['required', 'array'],
            'configuration.start_date' => ['required', 'date'],
            'configuration.end_date' => ['required', 'date', 'after:configuration.start_date'],
            'configuration.columns' => ['required', 'array', 'min:1'],
            'configuration.columns.*' => ['string'],
            'configuration.filters' => ['nullable', 'array'],
            'configuration.sort_by' => ['nullable', 'string'],
            'configuration.sort_direction' => ['nullable', 'in:asc,desc'],
            'configuration.include_charts' => ['nullable', 'boolean'],
        ])->validate();

        $config = RapportConfiguration::query()->find($validated['id'] ?? null);

        if ($config && $request->user()->role !== 'Admin' && $config->created_by_user_id !== $request->user()->id) {
            abort(403, 'Vous ne pouvez pas modifier cette configuration.');
        }

        $config ??= new RapportConfiguration();
        $config->fill([
            'nom' => $validated['nom'],
            'description' => $validated['description'] ?? null,
            'configuration' => $validated['configuration'],
            'created_by_user_id' => $config->created_by_user_id ?? $request->user()->id,
        ]);
        $config->save();

        return response()->json($config->load('creator:id,nom,email'), Response::HTTP_CREATED);
    }

    public function supprimerConfiguration(Request $request, RapportConfiguration $configuration): Response
    {
        $this->authorizeBuilder($request);

        if ($request->user()->role !== 'Admin' && $configuration->created_by_user_id !== $request->user()->id) {
            abort(403, 'Vous ne pouvez pas supprimer cette configuration.');
        }

        $configuration->delete();

        return response()->noContent();
    }

    public function generer(Request $request): JsonResponse|StreamedResponse|BinaryFileResponse|Response
    {
        $this->authorizeBuilder($request);

        $validated = Validator::make($request->all(), [
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
            'columns' => ['nullable', 'array'],
            'columns.*' => ['string'],
            'filters' => ['nullable', 'array'],
            'filters.statuses' => ['nullable', 'array'],
            'filters.statuses.*' => ['string'],
            'filters.department' => ['nullable', 'string'],
            'filters.manager' => ['nullable', 'string'],
            'filters.employee' => ['nullable', 'string'],
            'filters.amount_min' => ['nullable', 'numeric', 'min:0'],
            'filters.amount_max' => ['nullable', 'numeric', 'gte:filters.amount_min'],
            'filters.note_ids' => ['nullable', 'array'],
            'filters.note_ids.*' => ['integer'],
            'sort_by' => ['nullable', 'string'],
            'sort_direction' => ['nullable', 'in:asc,desc'],
            'format' => ['nullable', 'in:json,csv,xlsx,pdf'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:20'],
            'include_charts' => ['nullable', 'boolean'],
        ])->validate();

        $selectedColumns = $this->sanitizeColumns($validated['columns'] ?? $this->defaultColumns());
        $format = $validated['format'] ?? 'json';
        $page = (int) ($validated['page'] ?? 1);
        $perPage = min((int) ($validated['per_page'] ?? 20), 20);

        $query = $this->buildReportQuery($validated);
        $query = $this->applySort($query, $validated['sort_by'] ?? 'mission_created_at', $validated['sort_direction'] ?? 'desc');

        $summary = $this->buildSummary(clone $query);
        $columns = collect($selectedColumns)->map(fn (string $key): array => $this->columnDefinitions()[$key])->values();

        if ($format === 'json') {
            $total = (clone $query)->count();
            $notes = $query->forPage($page, $perPage)->get();
            $rows = $this->mapRows($notes, $selectedColumns);

            return response()->json([
                'columns' => $columns,
                'rows' => $rows,
                'summary' => $summary,
                'charts' => ! empty($validated['include_charts']) ? $this->buildCharts($validated) : null,
                'meta' => [
                    'page' => $page,
                    'per_page' => $perPage,
                    'total' => $total,
                    'total_pages' => (int) ceil(max($total, 1) / $perPage),
                ],
            ]);
        }

        $notes = $query->get();
        $rows = $this->mapRows($notes, $selectedColumns);
        $chartData = ! empty($validated['include_charts']) ? $this->buildCharts($validated) : null;

        return match ($format) {
            'csv' => $this->streamDynamicCsv($columns, $rows),
            'xlsx' => $this->exportExcel($columns, $rows, $summary, $chartData, $validated),
            'pdf' => $this->exportPdf($columns, $rows, $summary, $validated),
            default => response()->json(['message' => 'Format non pris en charge.'], Response::HTTP_UNPROCESSABLE_ENTITY),
        };
    }

    private function authorizeBuilder(Request $request): void
    {
        abort_unless(in_array($request->user()->role, ['RH', 'Admin'], true), 403);
    }

    private function sanitizeColumns(array $columns): array
    {
        $definitions = $this->columnDefinitions();
        $valid = collect($columns)
            ->filter(fn (mixed $column): bool => is_string($column) && isset($definitions[$column]))
            ->unique()
            ->values()
            ->all();

        return $valid !== [] ? $valid : $this->defaultColumns();
    }

    private function defaultColumns(): array
    {
        return [
            'employee_name',
            'employee_department',
            'mission_title',
            'mission_created_at',
            'amount_total',
            'status_current',
            'manager_name',
            'accounting_reference',
        ];
    }

    private function columnDefinitions(): array
    {
        return [
            'employee_name' => ['key' => 'employee_name', 'label' => 'Employe', 'sortable' => true],
            'employee_email' => ['key' => 'employee_email', 'label' => 'Email employe', 'sortable' => true],
            'employee_matricule' => ['key' => 'employee_matricule', 'label' => 'Matricule', 'sortable' => true],
            'employee_department' => ['key' => 'employee_department', 'label' => 'Departement', 'sortable' => true],
            'mission_title' => ['key' => 'mission_title', 'label' => 'Mission', 'sortable' => true],
            'mission_created_at' => ['key' => 'mission_created_at', 'label' => 'Date creation', 'sortable' => true],
            'amount_total' => ['key' => 'amount_total', 'label' => 'Montant total', 'sortable' => true],
            'amount_details' => ['key' => 'amount_details', 'label' => 'Details montant', 'sortable' => false],
            'status_current' => ['key' => 'status_current', 'label' => 'Statut actuel', 'sortable' => true],
            'status_history' => ['key' => 'status_history', 'label' => 'Historique statut', 'sortable' => false],
            'submitted_at' => ['key' => 'submitted_at', 'label' => 'Date soumission', 'sortable' => true],
            'manager_validated_at' => ['key' => 'manager_validated_at', 'label' => 'Validation manager', 'sortable' => true],
            'rh_validated_at' => ['key' => 'rh_validated_at', 'label' => 'Validation RH', 'sortable' => true],
            'reimbursed_at' => ['key' => 'reimbursed_at', 'label' => 'Remboursement', 'sortable' => true],
            'manager_name' => ['key' => 'manager_name', 'label' => 'Manager', 'sortable' => true],
            'manager_email' => ['key' => 'manager_email', 'label' => 'Email manager', 'sortable' => true],
            'accounting_reference' => ['key' => 'accounting_reference', 'label' => 'Reference comptable', 'sortable' => true],
        ];
    }

    private function buildReportQuery(array $validated): Builder
    {
        $filters = $validated['filters'] ?? [];

        $query = NoteDeFrais::query()
            ->with([
                'employe:id,nom,email,matricule,departement',
                'responsable:id,nom,email',
                'lignesDepense.categorie:id,nom,code',
                'historique:id,note_de_frais_id,validateur_email,action,date_decision,commentaire',
            ])
            ->whereDate('date_creation', '>=', $validated['start_date'])
            ->whereDate('date_creation', '<=', $validated['end_date']);

        if (! empty($filters['statuses'])) {
            $query->whereIn('statut', $filters['statuses']);
        }

        if (! empty($filters['department'])) {
            $query->whereHas('employe', fn (Builder $builder) => $builder->where('departement', $filters['department']));
        }

        if (! empty($filters['manager'])) {
            $query->where('email_responsable', $filters['manager']);
        }

        if (! empty($filters['employee'])) {
            $query->where('email_employe', $filters['employee']);
        }

        if (isset($filters['amount_min'])) {
            $query->where('total_note', '>=', $filters['amount_min']);
        }

        if (isset($filters['amount_max'])) {
            $query->where('total_note', '<=', $filters['amount_max']);
        }

        if (! empty($filters['note_ids'])) {
            $query->whereIn('id', $filters['note_ids']);
        }

        return $query;
    }

    private function applySort(Builder $query, string $sortBy, string $direction): Builder
    {
        $direction = $direction === 'asc' ? 'asc' : 'desc';

        return match ($sortBy) {
            'employee_name' => $query->orderBy(
                User::query()->select('nom')->whereColumn('users.email', 'notes_de_frais.email_employe')->limit(1),
                $direction
            ),
            'employee_email' => $query->orderBy('email_employe', $direction),
            'employee_matricule' => $query->orderBy('matricule_employe', $direction),
            'employee_department' => $query->orderBy(
                User::query()->select('departement')->whereColumn('users.email', 'notes_de_frais.email_employe')->limit(1),
                $direction
            ),
            'mission_title' => $query->orderBy('titre_mission', $direction),
            'mission_created_at' => $query->orderBy('date_creation', $direction),
            'amount_total' => $query->orderBy('total_note', $direction),
            'status_current' => $query->orderBy('statut', $direction),
            'submitted_at' => $query->orderBy('date_soumission', $direction),
            'manager_validated_at' => $query->orderBy('date_validation_manager', $direction),
            'rh_validated_at' => $query->orderBy(
                HistoriqueApprobation::query()
                    ->select('date_decision')
                    ->whereColumn('historique_approbations.note_de_frais_id', 'notes_de_frais.id')
                    ->where('action', 'approuve_rh')
                    ->latest('date_decision')
                    ->limit(1),
                $direction
            ),
            'reimbursed_at' => $query->orderBy('date_remboursement', $direction),
            'manager_name' => $query->orderBy(
                User::query()->select('nom')->whereColumn('users.email', 'notes_de_frais.email_responsable')->limit(1),
                $direction
            ),
            'manager_email' => $query->orderBy('email_responsable', $direction),
            'accounting_reference' => $query->orderBy('reference_comptable', $direction),
            default => $query->orderBy('date_creation', 'desc'),
        };
    }

    private function mapRows(Collection $notes, array $columns): array
    {
        return $notes->map(function (NoteDeFrais $note) use ($columns): array {
            $row = ['note_id' => $note->id];

            foreach ($columns as $column) {
                $row[$column] = $this->resolveColumnValue($note, $column);
            }

            return $row;
        })->all();
    }

    private function resolveColumnValue(NoteDeFrais $note, string $column): string|float|int|null
    {
        $rhApprovalDate = $note->historique
            ->where('action', 'approuve_rh')
            ->sortByDesc('date_decision')
            ->first()?->date_decision;

        return match ($column) {
            'employee_name' => $note->employe?->nom,
            'employee_email' => $note->email_employe,
            'employee_matricule' => $note->matricule_employe,
            'employee_department' => $note->employe?->departement,
            'mission_title' => $note->titre_mission,
            'mission_created_at' => $this->formatDate($note->date_creation),
            'amount_total' => round((float) $note->total_note, 2),
            'amount_details' => $note->lignesDepense
                ->map(fn ($ligne): string => ($ligne->categorie?->nom ?? 'Categorie').': '.number_format((float) $ligne->montant, 2, '.', ' ').' DH')
                ->implode(' | '),
            'status_current' => $this->humanizeStatus($note->statut),
            'status_history' => $note->historique
                ->sortBy('date_decision')
                ->map(fn ($entry): string => $this->humanizeHistoryAction($entry->action).' ('.$this->formatDateTime($entry->date_decision).')')
                ->implode(' | '),
            'submitted_at' => $this->formatDateTime($note->date_soumission),
            'manager_validated_at' => $this->formatDateTime($note->date_validation_manager),
            'rh_validated_at' => $this->formatDateTime($rhApprovalDate),
            'reimbursed_at' => $this->formatDateTime($note->date_remboursement),
            'manager_name' => $note->responsable?->nom,
            'manager_email' => $note->email_responsable,
            'accounting_reference' => $note->reference_comptable,
            default => null,
        };
    }

    private function buildSummary(Builder $query): array
    {
        $notes = $query->get(['id', 'total_note', 'statut']);

        return [
            'count' => $notes->count(),
            'total_amount' => round((float) $notes->sum('total_note'), 2),
            'average_amount' => round((float) $notes->avg('total_note'), 2),
            'reimbursed_count' => $notes->where('statut', 'rembourse')->count(),
            'pending_count' => $notes->whereIn('statut', ['en_attente_responsable', 'en_attente_rh', 'a_corriger'])->count(),
        ];
    }

    private function buildCharts(array $validated): array
    {
        $base = $this->buildReportQuery($validated);
        $monthExpression = DB::getDriverName() === 'sqlite'
            ? "strftime('%Y-%m', date_creation)"
            : "DATE_FORMAT(date_creation, '%Y-%m')";

        $categories = (clone $base)
            ->join('lignes_depense as ld', 'ld.note_de_frais_id', '=', 'notes_de_frais.id')
            ->join('categories_depense as cd', 'cd.id', '=', 'ld.categorie_id')
            ->selectRaw('cd.nom as categorie, SUM(ld.montant) as total')
            ->groupBy('cd.nom')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row): array => [
                'label' => $row->categorie,
                'value' => round((float) $row->total, 2),
            ]);

        $monthly = (clone $base)
            ->selectRaw($monthExpression.' as mois, SUM(total_note) as total')
            ->groupBy('mois')
            ->orderBy('mois')
            ->get()
            ->map(fn ($row): array => [
                'label' => $row->mois,
                'value' => round((float) $row->total, 2),
            ]);

        return [
            'categories' => $categories,
            'months' => $monthly,
        ];
    }

    private function streamDynamicCsv(Collection $columns, array $rows): StreamedResponse
    {
        $filename = 'rapport-dynamique-'.now()->format('Ymd-His').'.csv';

        return response()->streamDownload(function () use ($columns, $rows): void {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, $columns->pluck('label')->all());

            foreach ($rows as $row) {
                fputcsv($handle, $columns->map(fn (array $column) => $row[$column['key']] ?? '')->all());
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    private function exportExcel(Collection $columns, array $rows, array $summary, ?array $charts, array $validated): BinaryFileResponse
    {
        if (class_exists(\Maatwebsite\Excel\Facades\Excel::class)) {
            $filename = 'rapport-dynamique-'.now()->format('Ymd-His').'.xlsx';

            return \Maatwebsite\Excel\Facades\Excel::download(
                new RapportDynamiqueExport($columns, $rows, $summary, $charts, $validated),
                $filename
            );
        }

        $workbook = app(NativeXlsxExportService::class);
        $path = $workbook->build([
            [
                'name' => 'Rapport',
                'rows' => [
                    $columns->pluck('label')->all(),
                    ...collect($rows)->map(fn (array $row): array => $columns->map(fn (array $column) => $row[$column['key']] ?? '')->all())->all(),
                ],
            ],
            [
                'name' => 'Synthese',
                'rows' => [
                    ['Indicateur', 'Valeur'],
                    ['Nombre de notes', $summary['count']],
                    ['Montant total', $summary['total_amount']],
                    ['Montant moyen', $summary['average_amount']],
                    ['Remboursees', $summary['reimbursed_count']],
                    ['En attente', $summary['pending_count']],
                ],
            ],
            [
                'name' => 'Graphiques',
                'rows' => $this->chartSheetRows($charts),
            ],
        ]);

        return response()->download($path, 'rapport-dynamique-'.now()->format('Ymd-His').'.xlsx')->deleteFileAfterSend(true);
    }

    private function exportPdf(Collection $columns, array $rows, array $summary, array $validated): Response|JsonResponse
    {
        if (! class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
            return response()->json([
                'message' => 'Export PDF indisponible tant que le package barryvdh/laravel-dompdf n est pas installe.',
            ], Response::HTTP_NOT_IMPLEMENTED);
        }

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.rapport-dynamique', [
            'titre' => 'Rapport dynamique notes de frais',
            'generatedAt' => now(),
            'filters' => $validated,
            'columns' => $columns,
            'rows' => $rows,
            'summary' => $summary,
        ])->setPaper('a4', 'landscape');

        return $pdf->download('rapport-dynamique-'.now()->format('Ymd-His').'.pdf');
    }

    private function chartSheetRows(?array $charts): array
    {
        $rows = [['Section', 'Libelle', 'Valeur']];

        if (! $charts) {
            $rows[] = ['Graphiques', 'Aucune donnee', 0];

            return $rows;
        }

        foreach ($charts['categories'] ?? [] as $point) {
            $rows[] = ['Categories', $point['label'], $point['value']];
        }

        foreach ($charts['months'] ?? [] as $point) {
            $rows[] = ['Mois', $point['label'], $point['value']];
        }

        return $rows;
    }

    private function formatDate(Carbon|string|null $value): ?string
    {
        if (! $value) {
            return null;
        }

        return Carbon::parse($value)->format('Y-m-d');
    }

    private function formatDateTime(Carbon|string|null $value): ?string
    {
        if (! $value) {
            return null;
        }

        return Carbon::parse($value)->format('Y-m-d H:i');
    }

    private function humanizeStatus(string $status): string
    {
        return match ($status) {
            'brouillon' => 'Brouillon',
            'en_attente_responsable' => 'En attente manager',
            'en_attente_rh' => 'En attente RH',
            'valide_paiement' => 'Valide paiement',
            'refuse' => 'Refuse',
            'rembourse' => 'Rembourse',
            'a_corriger' => 'A corriger',
            default => $status,
        };
    }

    private function humanizeHistoryAction(string $action): string
    {
        return match ($action) {
            'approuve_manager' => 'Approuve manager',
            'approuve_rh' => 'Approuve RH',
            'refuse' => 'Refus',
            'demande_correction' => 'Demande correction',
            'rembourse' => 'Rembourse',
            'archiver' => 'Archive',
            'admin_update' => 'Mise a jour admin',
            'admin_force_status' => 'Changement statut admin',
            'admin_expense_add' => 'Ajout ligne admin',
            'admin_expense_update' => 'Modification ligne admin',
            'admin_expense_delete' => 'Suppression ligne admin',
            'admin_receipt_delete' => 'Suppression justificatif admin',
            default => $action,
        };
    }
}
