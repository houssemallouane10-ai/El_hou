import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';

import '../../domain/grader_repositories.dart';
import '../../domain/grading.dart';

/// The student's recent gradings, newest first.
class GradingHistoryCubit extends Cubit<List<GradingRecord>> {
  GradingHistoryCubit(GradingHistoryRepository repository, String uid)
    : super(const []) {
    _subscription = repository.watch(uid).listen(emit, onError: (_) {});
  }

  late final StreamSubscription<List<GradingRecord>> _subscription;

  Map<String, double> get weakness => weaknessBySubject(state);

  @override
  Future<void> close() {
    _subscription.cancel();
    return super.close();
  }
}
